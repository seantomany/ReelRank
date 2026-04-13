import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput as RNTextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Text, Snackbar } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { API_URL } from '../config/api';
import { OptimizedImage } from '../components/OptimizedImage';
import { getPosterUrl } from '@reelrank/shared';
import { colors, spacing, borderRadius } from '../theme';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

interface AIScreenProps {
  navigation: NativeStackNavigationProp<any>;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const STARTERS = [
  'What should I watch tonight?',
  'Recommend something like my top-ranked movie',
  'I want something totally new and unexpected',
  'Help me pick a movie for a group',
];

function MovieCardInline({
  searchQuery,
  onPress,
}: {
  searchQuery: string;
  onPress: (movieId: number) => void;
}) {
  const [movie, setMovie] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api.ai
      .movieSearch(searchQuery)
      .then((res) => {
        if (!cancelled && res.data) setMovie(res.data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [searchQuery]);

  if (loading) {
    return (
      <View style={cardStyles.skeleton}>
        <View style={cardStyles.skeletonPoster} />
        <View style={cardStyles.skeletonLines}>
          <View style={[cardStyles.skeletonLine, { width: '75%' }]} />
          <View style={[cardStyles.skeletonLine, { width: '50%' }]} />
        </View>
      </View>
    );
  }

  if (!movie) {
    return (
      <View style={cardStyles.fallback}>
        <Ionicons name="sparkles" size={16} color={colors.accent} />
        <Text style={cardStyles.fallbackText}>{searchQuery}</Text>
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={cardStyles.card}
      onPress={() => onPress(movie.id)}
      activeOpacity={0.7}
    >
      <OptimizedImage
        uri={getPosterUrl(movie.posterPath, 'small')}
        style={cardStyles.poster}
      />
      <View style={cardStyles.info}>
        <Text style={cardStyles.title} numberOfLines={1}>
          {movie.title}
        </Text>
        <Text style={cardStyles.meta}>
          {movie.releaseDate?.slice(0, 4)}
          {movie.voteAverage > 0 ? ` · ${movie.voteAverage.toFixed(1)} / 10` : ''}
        </Text>
        {movie.overview && (
          <Text style={cardStyles.overview} numberOfLines={2}>
            {movie.overview}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

function parseBoldText(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /\*\*([^*]+)\*\*/g;
  let lastIdx = 0;
  let m;

  while ((m = regex.exec(text)) !== null) {
    if (m.index > lastIdx) {
      parts.push(
        <Text key={`t-${lastIdx}`} style={styles.messageText}>
          {text.slice(lastIdx, m.index)}
        </Text>
      );
    }
    parts.push(
      <Text key={`b-${m.index}`} style={styles.boldAccent}>
        {m[1]}
      </Text>
    );
    lastIdx = m.index + m[0].length;
  }

  if (lastIdx < text.length) {
    parts.push(
      <Text key={`t-${lastIdx}`} style={styles.messageText}>
        {text.slice(lastIdx)}
      </Text>
    );
  }

  return parts;
}

export function AIScreen({ navigation }: AIScreenProps) {
  const { getIdToken } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isStreaming) return;

      setError(null);
      const userMessage: ChatMessage = { role: 'user', content: content.trim() };
      const newMessages = [...messages, userMessage];
      setMessages(newMessages);
      setInput('');
      setIsStreaming(true);

      try {
        const token = await getIdToken();
        // React Native's fetch does not expose ReadableStream on response.body,
        // so use XMLHttpRequest with onprogress to consume the SSE stream.
        let assistantContent = '';
        let buffer = '';
        let lastIndex = 0;

        const processChunk = (chunk: string) => {
          buffer += chunk;
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const payload = line.slice(6).trim();
            if (!payload || payload === '[DONE]') continue;
            try {
              const parsed = JSON.parse(payload);
              if (parsed.error) throw new Error(parsed.error);
              if (parsed.text) {
                assistantContent += parsed.text;
                setMessages([...newMessages, { role: 'assistant', content: assistantContent }]);
              }
            } catch (e) {
              if (e instanceof Error && !(e.message.includes('JSON'))) throw e;
            }
          }
        };

        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', `${API_URL}/api/ai/chat`);
          xhr.setRequestHeader('Content-Type', 'application/json');
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);

          xhr.onprogress = () => {
            const newText = xhr.responseText.slice(lastIndex);
            lastIndex = xhr.responseText.length;
            if (newText) {
              try {
                processChunk(newText);
              } catch (e) {
                reject(e instanceof Error ? e : new Error(String(e)));
                xhr.abort();
              }
            }
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              const tail = xhr.responseText.slice(lastIndex);
              if (tail) {
                try {
                  processChunk(tail);
                } catch (e) {
                  reject(e instanceof Error ? e : new Error(String(e)));
                  return;
                }
              }
              resolve();
            } else {
              try {
                const errData = JSON.parse(xhr.responseText);
                reject(new Error(errData.error ?? `Request failed (${xhr.status})`));
              } catch {
                reject(new Error(`Request failed (${xhr.status})`));
              }
            }
          };

          xhr.onerror = () => reject(new Error('Network request failed'));
          xhr.ontimeout = () => reject(new Error('Request timed out'));

          xhr.send(JSON.stringify({ messages: newMessages }));
        });

        if (assistantContent) {
          setMessages([...newMessages, { role: 'assistant', content: assistantContent }]);
        }
      } catch (err) {
        const msg = (err as Error).message || 'Something went wrong';
        setError(msg);
      } finally {
        setIsStreaming(false);
      }
    },
    [messages, isStreaming, getIdToken]
  );

  const handleReset = () => {
    setMessages([]);
    setInput('');
    setError(null);
    setIsStreaming(false);
  };

  const navigateToMovie = (movieId: number) => {
    navigation.navigate('MovieDetail', { movieId });
  };

  const renderContent = (text: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    const regex = /\[MOVIE_SEARCH:([^\]]+)\]|\[MOVIE:(\d+):([^\]]+)\]/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        const segment = text.slice(lastIndex, match.index);
        parts.push(
          <Text key={`s-${lastIndex}`}>{parseBoldText(segment)}</Text>
        );
      }

      const query = match[1] || match[3] || '';
      parts.push(
        <MovieCardInline
          key={`m-${match.index}`}
          searchQuery={query}
          onPress={navigateToMovie}
        />
      );

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      const rest = text.slice(lastIndex).replace(/\[CHOICES:[^\]]+\]/g, '');
      if (rest.trim()) {
        parts.push(
          <Text key={`s-${lastIndex}`}>{parseBoldText(rest)}</Text>
        );
      }
    }

    return parts;
  };

  const extractChoices = (text: string): string[] | null => {
    const match = text.match(/\[CHOICES:([^\]]+)\]/);
    if (!match) return null;
    return match[1]
      .split('|')
      .map((s) => s.trim())
      .filter(Boolean);
  };

  const isEmpty = messages.length === 0;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {!isEmpty && (
        <View style={styles.headerBar}>
          <Ionicons name="sparkles" size={16} color={colors.accent} />
          <Text style={styles.headerTitle}>ReelRank AI</Text>
          <TouchableOpacity onPress={handleReset} style={styles.resetButton}>
            <Ionicons name="refresh" size={16} color={colors.textSecondary} />
            <Text style={styles.resetText}>New chat</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        ref={scrollRef}
        style={styles.messagesArea}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
      >
        {isEmpty ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="sparkles" size={28} color={colors.accent} />
            </View>
            <Text style={styles.emptyTitle}>What are you in the mood for?</Text>
            <Text style={styles.emptySubtitle}>
              I know your taste. Tell me what you're feeling and I'll find the
              perfect movie.
            </Text>
            <View style={styles.starters}>
              {STARTERS.map((starter) => (
                <TouchableOpacity
                  key={starter}
                  style={styles.starterButton}
                  onPress={() => sendMessage(starter)}
                >
                  <Text style={styles.starterText}>{starter}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          messages.map((msg, i) => {
            const isUser = msg.role === 'user';
            const choices =
              !isUser && !isStreaming ? extractChoices(msg.content) : null;

            return (
              <View
                key={`${i}-${msg.role}`}
                style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}
              >
                {isUser ? (
                  <Text style={styles.userText}>{msg.content}</Text>
                ) : (
                  <View>{renderContent(msg.content)}</View>
                )}
                {choices && (
                  <View style={styles.choicesRow}>
                    {choices.map((opt) => (
                      <TouchableOpacity
                        key={opt}
                        style={styles.choiceButton}
                        onPress={() => sendMessage(opt)}
                        disabled={isStreaming}
                      >
                        <Text style={styles.choiceText}>{opt}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            );
          })
        )}

        {isStreaming && (
          <View style={styles.streamingIndicator}>
            <ActivityIndicator size="small" color={colors.accent} />
            <Text style={styles.streamingText}>Thinking...</Text>
          </View>
        )}

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.inputBar}>
        <RNTextInput
          style={styles.textInput}
          placeholder="Ask me anything about movies..."
          placeholderTextColor={colors.textTertiary}
          value={input}
          onChangeText={setInput}
          editable={!isStreaming}
          onSubmitEditing={() => sendMessage(input)}
          returnKeyType="send"
          autoCorrect={false}
          multiline={false}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!input.trim() || isStreaming) && styles.sendButtonDisabled,
          ]}
          onPress={() => sendMessage(input)}
          disabled={!input.trim() || isStreaming}
        >
          <Ionicons name="send" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    marginVertical: spacing.xs,
    gap: spacing.sm,
  },
  poster: {
    width: 50,
    height: 75,
    borderRadius: borderRadius.sm,
  },
  info: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  meta: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  overview: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 15,
  },
  skeleton: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginVertical: spacing.xs,
    gap: spacing.sm,
  },
  skeletonPoster: {
    width: 50,
    height: 75,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceVariant,
  },
  skeletonLines: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.sm,
  },
  skeletonLine: {
    height: 12,
    borderRadius: 4,
    backgroundColor: colors.surfaceVariant,
  },
  fallback: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    marginVertical: spacing.xs,
    gap: spacing.sm,
  },
  fallbackText: {
    fontSize: 13,
    color: colors.text,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  headerTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  resetText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  messagesArea: {
    flex: 1,
  },
  messagesContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: `${colors.accent}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  starters: {
    width: '100%',
    gap: spacing.sm,
  },
  starterButton: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  starterText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  bubble: {
    marginBottom: spacing.md,
    maxWidth: '85%',
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: `${colors.accent}20`,
    borderWidth: 1,
    borderColor: `${colors.accent}30`,
    borderRadius: borderRadius.lg,
    borderBottomRightRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
  },
  userText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  messageText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  boldAccent: {
    fontSize: 14,
    color: colors.accent,
    fontWeight: '600',
    lineHeight: 20,
  },
  choicesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  choiceButton: {
    borderWidth: 1,
    borderColor: `${colors.accent}50`,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  choiceText: {
    fontSize: 13,
    color: colors.accent,
  },
  streamingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  streamingText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  errorBox: {
    backgroundColor: `${colors.error}15`,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginTop: spacing.sm,
  },
  errorText: {
    fontSize: 13,
    color: colors.error,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  textInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? spacing.sm + 2 : spacing.sm,
    fontSize: 14,
    color: colors.text,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.3,
  },
});
