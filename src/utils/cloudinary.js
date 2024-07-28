import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import path from "path";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});
const uploadCloudinary = async (localFilePath) => {
    try {
        // If local file is not available
        if (!localFilePath) return null;

        // upload the file in cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto",
        });

        // file has been uploaded successfully
        console.log("File details : ", response);

        // remove file from the server
        fs.unlinkSync(localFilePath);
        return response;
    } catch (error) {
        console.log("file uploading failed");
        fs.unlinkSync(localFilePath); // remove the locally saved temporary file as the upload operation got failed
        return null;
    }
};

const deleteCloudinary = async (fileUrl) => {
    try {
        const publicId = path.basename(fileUrl, path.extname(fileUrl));
        console.log(publicId);
        await cloudinary.uploader.destroy(publicId);
    } catch (error) {
        console.log("file uploading failed");
        return null;
    }
};

export { uploadCloudinary, deleteCloudinary };
