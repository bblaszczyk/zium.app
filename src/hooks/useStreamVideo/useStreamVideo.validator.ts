import { z } from "zod";

export const streamVideoBodyValidator = z.object({
  resultObj: z.object({
    channelId: z.number(),
    streamType: z.string(),
    url: z.string(),
    laURL: z.string().optional(),
  }),
});
