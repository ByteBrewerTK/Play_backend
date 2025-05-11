import axios from "axios";
import { ApiError } from "./ApiError.js";

const generateEmbedding = async (text) => {
    console.log(text);
    try {
        const response = await axios.post(
            "https://api.cohere.ai/v1/embed",
            {
                texts: [text],
                model: "embed-english-v3.0", // or "embed-multilingual-v3.0" if needed
                input_type: "search_document", // or "search_query", depending on use case
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.COHERE_API_KEY}`,
                    "Content-Type": "application/json",
                },
            }
        );
        console.log(response.data);

        return response.data.embeddings?.[0];
    } catch (error) {
        console.error(
            "Embedding generation error:",
            error.response?.data || error.message
        );
        throw new ApiError(500, "Embedding generation failed.");
    }
};

export default generateEmbedding;
