import faceapi from "face-api.js";
import canvas from "canvas";
import path from "path";
import { fileURLToPath } from "url";


const { Canvas, Image, ImageData } = canvas;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const loadModels = async () => {
    const MODEL_PATH = path.join(__dirname, "../models");
    await faceapi.nets.ssdMobilenetv1.loadFromDisk(MODEL_PATH);
    await faceapi.nets.ageGenderNet.loadFromDisk(MODEL_PATH);
};

const detectAge = async (imageBuffer) => {
    const img = await canvas.loadImage(imageBuffer);
    const detection = await faceapi.detectSingleFace(img).withAgeAndGender();

    if (!detection) {
        throw new Error("No face detected");
    }

    return {
        age: Math.round(detection.age),
        gender: detection.gender,
        confidence: detection.genderProbability.toFixed(2),
    };
};
export { loadModels, detectAge };
