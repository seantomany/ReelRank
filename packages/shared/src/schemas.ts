import { z } from 'zod';

export const SwipeDirectionSchema = z.enum(['left', 'right']);

export const SoloSwipeInputSchema = z.object({
  movieId: z.number().int().positive(),
  direction: SwipeDirectionSchema,
});

export const PairwiseChoiceInputSchema = z.object({
  movieAId: z.number().int().positive(),
  movieBId: z.number().int().positive(),
  chosenId: z.number().int().positive(),
}).refine(
  (data) => data.chosenId === data.movieAId || data.chosenId === data.movieBId,
  { message: 'chosenId must be either movieAId or movieBId' }
);

export const AlgorithmTypeSchema = z.enum([
  'simple_majority_v1',
  'elo_group_v1',
  'ranked_choice_v1',
]);

export const CreateRoomInputSchema = z.object({
  name: z.string().max(50).optional(),
  algorithmVersion: AlgorithmTypeSchema.optional().default('simple_majority_v1'),
});

export const RoomCodeSchema = z.string().length(6).regex(/^[A-Z0-9]+$/);

export const JoinRoomInputSchema = z.object({
  code: RoomCodeSchema,
});

export const SubmitMovieInputSchema = z.object({
  movieId: z.number().int().positive(),
});

export const RoomSwipeInputSchema = z.object({
  movieId: z.number().int().positive(),
  direction: SwipeDirectionSchema,
});

export const StartRoomInputSchema = z.object({
  phase: z.enum(['submitting', 'swiping']),
});

export const MovieSearchQuerySchema = z.object({
  query: z.string().min(1).max(100),
  page: z.coerce.number().int().min(1).max(500).optional().default(1),
});

export const ListTypeSchema = z.enum(['want', 'pass']);

export const TrendingPageSchema = z.object({
  page: z.coerce.number().int().min(1).max(500).optional().default(1),
});

export const WatchedMovieInputSchema = z.object({
  movieId: z.number().int().positive(),
  rating: z.number().min(1).max(10),
  watchedAt: z.string(),
  venue: z.enum(['Theater', 'Home', "Friend's", 'Outdoor', 'Other']),
  notes: z.string().max(500).optional(),
});

export const TriageZoneSchema = z.enum(['loved', 'liked', 'okay', 'disliked']);

export const RankMovieInputSchema = z.object({
  movieId: z.number().int().positive(),
  insertAtIndex: z.number().int().min(0),
});

export const UpdateProfileInputSchema = z.object({
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
});

export type SoloSwipeInput = z.infer<typeof SoloSwipeInputSchema>;
export type PairwiseChoiceInput = z.infer<typeof PairwiseChoiceInputSchema>;
export type CreateRoomInput = z.infer<typeof CreateRoomInputSchema>;
export type JoinRoomInput = z.infer<typeof JoinRoomInputSchema>;
export type SubmitMovieInput = z.infer<typeof SubmitMovieInputSchema>;
export type RoomSwipeInput = z.infer<typeof RoomSwipeInputSchema>;
export type StartRoomInput = z.infer<typeof StartRoomInputSchema>;
export type MovieSearchQuery = z.infer<typeof MovieSearchQuerySchema>;
export type RankMovieInput = z.infer<typeof RankMovieInputSchema>;
export type UpdateProfileInput = z.infer<typeof UpdateProfileInputSchema>;
export type WatchedMovieInput = z.infer<typeof WatchedMovieInputSchema>;
