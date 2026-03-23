import React from 'react';
import { Image, ImageStyle } from 'expo-image';
import { StyleProp } from 'react-native';

interface OptimizedImageProps {
  uri: string | null;
  style?: StyleProp<ImageStyle>;
  contentFit?: 'cover' | 'contain' | 'fill';
  placeholder?: string;
}

const BLURHASH_PLACEHOLDER = 'L6PZfSi_.AyE_3t7t7R**0o#DgR4';

export function OptimizedImage({
  uri,
  style,
  contentFit = 'cover',
  placeholder,
}: OptimizedImageProps) {
  if (!uri) {
    return (
      <Image
        style={style}
        placeholder={{ blurhash: placeholder ?? BLURHASH_PLACEHOLDER }}
        contentFit={contentFit}
      />
    );
  }

  return (
    <Image
      source={{ uri }}
      style={style}
      contentFit={contentFit}
      placeholder={{ blurhash: placeholder ?? BLURHASH_PLACEHOLDER }}
      transition={200}
      cachePolicy="disk"
    />
  );
}
