/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Modality } from '@google/genai';

const ai = new GoogleGenAI({apiKey: process.env.API_KEY});

// The model for image editing
const selectedModel = 'gemini-2.5-flash-image-preview';

// Base prompt for the scene
const romanticPrompt = 'make me doing romantic activities in old dhaka while in rain without umbrella. The final image should have a 9:16 portrait aspect ratio.';

// Get DOM elements
const imageUpload = document.getElementById('image-upload') as HTMLInputElement;
const imageUploadLabel = document.getElementById('image-upload-label') as HTMLLabelElement;
const generateButton = document.getElementById('generate-button') as HTMLButtonElement;
const imageGallery = document.getElementById('image-gallery');
const loader = document.getElementById('loader');
const postGenerateControls = document.getElementById('post-generate-controls');
const downloadButton = document.getElementById('download-button') as HTMLButtonElement;
const generateAgainButton = document.getElementById('generate-again-button') as HTMLButtonElement;


let uploadedImageData: { data: string; mimeType: string; } | null = null;
let currentImageSrc: string | null = null;

// Disable buttons initially
if (generateButton) generateButton.disabled = true;

/**
 * Converts a File object to a GoogleGenAI.Part object.
 * @param file The file to convert.
 * @returns A promise that resolves to the Part object.
 */
async function fileToGenerativePart(file: File) {
    const base64EncodedDataPromise = new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === 'string') {
                resolve(reader.result.split(',')[1]);
            }
        };
        reader.readAsDataURL(file);
    });
    return {
        inlineData: {
            data: await base64EncodedDataPromise,
            mimeType: file.type
        }
    };
}

// Handle file upload
imageUpload?.addEventListener('change', async (event) => {
    const files = (event.target as HTMLInputElement).files;
    if (files && files.length > 0) {
        const file = files[0];
        const part = await fileToGenerativePart(file);
        uploadedImageData = part.inlineData;
        if (imageUploadLabel) {
            imageUploadLabel.textContent = file.name;
        }
        if (generateButton) {
            generateButton.disabled = false;
        }
    } else {
        uploadedImageData = null;
        if (imageUploadLabel) {
            imageUploadLabel.textContent = 'Choose a File';
        }
        if (generateButton) {
            generateButton.disabled = true;
        }
    }
});

// Handle button clicks
generateButton?.addEventListener('click', generateImage);
generateAgainButton?.addEventListener('click', generateImage);
downloadButton?.addEventListener('click', downloadImage);


async function generateImage() {
    if (!uploadedImageData) {
        alert('Please upload an image first.');
        return;
    }
    
    if (!imageGallery || !loader || !generateButton || !postGenerateControls) return;

    // Show loader, clear gallery, disable buttons, hide post-gen controls
    loader.classList.remove('hidden');
    postGenerateControls.classList.add('hidden');
    imageGallery.textContent = '';
    currentImageSrc = null;
    generateButton.disabled = true;
    generateAgainButton.disabled = true;

    try {
        const textPart = { text: romanticPrompt };
        const imagePart = { inlineData: uploadedImageData };

        const response = await ai.models.generateContent({
            model: selectedModel,
            contents: {
                parts: [imagePart, textPart]
            },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });

        if (response?.candidates?.[0]?.content?.parts) {
            let imageFound = false;
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    const src = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                    currentImageSrc = src; // Save src for download
                    const img = document.createElement('img');
                    img.src = src;
                    img.alt = `A person from an uploaded image placed in a romantic rainy Dhaka street scene.`;
                    imageGallery.appendChild(img);
                    imageFound = true;
                    break; // Ensure we only process the first image found
                }
            }
            if (imageFound) {
                postGenerateControls.classList.remove('hidden');
            } else {
              throw new Error("API response did not contain an image.");
            }
        } else {
            throw new Error("Invalid response structure from API.");
        }

    } catch (error) {
        console.error("Error generating image:", error);
        const errorParagraph = document.createElement('p');
        errorParagraph.textContent = 'Error: Could not generate the image. Please try again. Check the console for details.';
        imageGallery.appendChild(errorParagraph);
    } finally {
        // Hide loader and re-enable buttons
        loader.classList.add('hidden');
        if(uploadedImageData) {
            generateButton.disabled = false;
            generateAgainButton.disabled = false;
        }
    }
}

function downloadImage() {
    if (!currentImageSrc) {
        alert("No image to download.");
        return;
    }
    const a = document.createElement('a');
    a.href = currentImageSrc;
    a.download = 'rainy-day-in-dhaka.png';
    document.body.appendChild(a);
a.click();
    document.body.removeChild(a);
}