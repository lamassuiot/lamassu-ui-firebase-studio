'use server';
/**
 * @fileOverview Mock KMS signing operations.
 *
 * - signData - A function that handles the mock data signing process.
 * - SignDataInput - The input type for the signData function.
 * - SignDataOutput - The return type for the signData function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

export const SignDataInputSchema = z.object({
  keyAlias: z.string().describe("The alias of the key to use for signing."),
  dataToSign: z.string().describe("The data to be signed (plain text or base64 for actual implementation)."),
  algorithm: z.string().describe("The signature algorithm to use (e.g., SHA256withRSA).")
});
export type SignDataInput = z.infer<typeof SignDataInputSchema>;

export const SignDataOutputSchema = z.object({
  signature: z.string().describe("The generated signature (base64 encoded string for actual implementation).")
});
export type SignDataOutput = z.infer<typeof SignDataOutputSchema>;

const signDataFlowInternal = ai.defineFlow(
  {
    name: 'signDataFlowMock',
    inputSchema: SignDataInputSchema,
    outputSchema: SignDataOutputSchema,
  },
  async (input) => {
    // Mock signing logic: Simulate a signature based on input.
    // In a real scenario, this would interact with a KMS.
    const signaturePayload = `${input.keyAlias}|${input.algorithm}|${input.dataToSign}`;
    const mockSignature = `mockSign_${Buffer.from(signaturePayload).toString('base64')}`;
    
    // Simulate some processing time
    await new Promise(resolve => setTimeout(resolve, 500));

    return { signature: mockSignature };
  }
);

export async function signData(input: SignDataInput): Promise<SignDataOutput> {
  console.log("KMS Sign Flow: Received request to sign data with key:", input.keyAlias, "algorithm:", input.algorithm);
  const result = await signDataFlowInternal(input);
  console.log("KMS Sign Flow: Mock signature generated:", result.signature);
  return result;
}
