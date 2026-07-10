import { GoogleGenAI } from "@google/genai";
import type { IOPReading } from '../types';
import { NORMAL_IOP_RANGE } from '../constants';

const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';

if (!API_KEY) {
  console.warn("EXPO_PUBLIC_GEMINI_API_KEY environment variable not set. AI features will not work.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

export const getAIInsight = async (readings: IOPReading[]): Promise<string> => {
  if (!API_KEY) {
    return "API Key not configured. Please set the EXPO_PUBLIC_GEMINI_API_KEY environment variable to use AI features.";
  }

  if (readings.length < 3) {
    return "Not enough data for a meaningful insight. Please record at least 3 readings.";
  }

  const formattedReadings = readings
    .slice(-10)
    .map(r => `On ${r.date.toLocaleDateString()}, the reading was ${r.value} mmHg.`)
    .join('\n');

  const prompt = `
    You are an AI health assistant specializing in ophthalmology.
    Analyze the following intraocular pressure (IOP) readings for a user monitoring for glaucoma risk.
    The normal IOP range is between ${NORMAL_IOP_RANGE.min} mmHg and ${NORMAL_IOP_RANGE.max} mmHg.

    Here are the recent readings:
    ${formattedReadings}

    Based on this data, provide a single, concise, and easy-to-understand insight (one or two sentences max).
    Focus on the overall trend (stable, increasing, decreasing) and whether the latest readings are within the normal range.
    Do not provide medical advice. Start your response directly with the insight.
    Example: "Your recent readings show a slight upward trend but remain within the normal range."
    Another Example: "Your pressure has been consistently stable and in a healthy range."
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text?.trim() ?? '';
  } catch (error) {
    console.error("Error fetching AI insight:", error);
    return "Could not retrieve AI insight at this time. Please try again later.";
  }
};
