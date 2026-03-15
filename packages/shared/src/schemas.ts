import { z } from 'zod';

export const SwipeDirectionSchema = z.enum(['left', 'right']);

export const RoomStatusSchema = z.enum(['lobby', 'submitting', 'swiping', 'results']);

export const SoloSwipeInputSchema = z.object({
  movieId: z.number().int().positive(),
  direction: SwipeDirectionSchema,
});

export const PairwiseChoiceInputSchema = z
  .object({
    movieAId: z.number().int().positive(),
    movieBId: z.number().int().positive(),
    chosenId: z.number().int().positive(),
  })
  .refine((d) => d.movieAId !== d.movieBId, {
    message: 'movieAId and movieBId must be different',
  })
  .refine((d) => d.chosenId === d.movieAId || d.chosenId === d.movieBId, {
    message: 'chosenId must be one of movieAId or movieBId',
  });

export const JoinRoomInputSchema = z.object({
  code: z.string().length(6).toUpperCase(),
});

export const SubmitMovieInputSchema = z.object({
  movieId: z.number().int().positive(),
});

export const RoomSwipeInputSchema = z.object({
  movieId: z.number().int().positive(),
  direction: SwipeDirectionSchema,
});

export const MovieSearchQuerySchema = z.object({
  query: z.string().min(1).max(200),
  page: z.coerce.number().int().min(1).max(500).default(1),
});

export const StartRoomInputSchema = z.object({
  phase: RoomStatusSchema,
});

export const WatchedMovieInputSchema = z.object({
  movieId: z.number().int().positive(),
  rating: z.number().min(1).max(10),
  watchedAt: z.string(),
  venue: z.string().min(1).max(100),
  notes: z.string().max(500).optional(),
});

export const AlgorithmTypeSchema = z.enum(['simple_majority_v1', 'elo_group_v1', 'ranked_choice_v1']);

export const CreateRoomInputSchema = z.object({
  algorithm: AlgorithmTypeSchema.default('simple_majority_v1'),
});

export const RoomCodeSchema = z.string().length(6).regex(/^[A-Z2-9]+$/, 'Invalid room code format');

export const ListTypeSchema = z.enum(['want', 'pass']);

export const TrendingPageSchema = z.coerce.number().int().min(1).max(500).default(1);

export type SoloSwipeInput = z.infer<typeof SoloSwipeInputSchema>;
export type PairwiseChoiceInput = z.infer<typeof PairwiseChoiceInputSchema>;
export type JoinRoomInput = z.infer<typeof JoinRoomInputSchema>;
export type SubmitMovieInput = z.infer<typeof SubmitMovieInputSchema>;
export type RoomSwipeInput = z.infer<typeof RoomSwipeInputSchema>;
export type MovieSearchQuery = z.infer<typeof MovieSearchQuerySchema>;
export type StartRoomInput = z.infer<typeof StartRoomInputSchema>;
export type WatchedMovieInput = z.infer<typeof WatchedMovieInputSchema>;
