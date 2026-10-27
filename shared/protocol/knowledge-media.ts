import { z } from 'zod';
export const KnowledgeEditorAsset=z.strictObject({id:z.uuid(),mime:z.enum(['image/png','image/jpeg','image/webp']),access:z.enum(['draft','asset'])});
export const KnowledgeAsset=KnowledgeEditorAsset.omit({access:true}).extend({
 fileName:z.string().regex(/^[a-f0-9-]+\.(png|jpg|webp)$/),sha256:z.string().regex(/^[a-f0-9]{64}$/),
});
export type KnowledgeAssetDTO=z.infer<typeof KnowledgeAsset>;
