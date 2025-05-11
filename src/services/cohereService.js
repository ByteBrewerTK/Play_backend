import axios from "axios";

class CohereService {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseUrl = "https://api.cohere.ai/v1";
    }

    async generateEmbeddings(text) {
        try {
            const response = await axios.post(
                `${this.baseUrl}/embed`,
                {
                    texts: [text],
                    model: "embed-english-v3.0",
                    truncate: "END",
                },
                {
                    headers: {
                        Authorization: `Bearer ${this.apiKey}`,
                        "Content-Type": "application/json",
                    },
                }
            );
            return response.data.embeddings[0];
        } catch (error) {
            console.error(
                "Error generating embeddings:",
                error.response?.data || error.message
            );
            throw new Error("Failed to generate embeddings");
        }
    }

    async generateBatchEmbeddings(texts) {
        try {
            const response = await axios.post(
                `${this.baseUrl}/embed`,
                {
                    texts,
                    model: "embed-english-v3.0",
                    truncate: "END",
                },
                {
                    headers: {
                        Authorization: `Bearer ${this.apiKey}`,
                        "Content-Type": "application/json",
                    },
                }
            );
            return response.data.embeddings;
        } catch (error) {
            console.error(
                "Error generating batch embeddings:",
                error.response?.data || error.message
            );
            throw new Error("Failed to generate batch embeddings");
        }
    }

    async searchSimilarText(query, options = {}) {
        try {
            const response = await axios.post(
                `${this.baseUrl}/rerank`,
                {
                    query,
                    documents: options.documents || [],
                    model: "rerank-english-v2.0",
                    top_n: options.topN || 5,
                    return_documents: true,
                },
                {
                    headers: {
                        Authorization: `Bearer ${this.apiKey}`,
                        "Content-Type": "application/json",
                    },
                }
            );
            return response.data.results;
        } catch (error) {
            console.error(
                "Error searching similar text:",
                error.response?.data || error.message
            );
            throw new Error("Failed to search similar text");
        }
    }
}

module.exports = CohereService;
