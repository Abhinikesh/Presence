const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const musicStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'presence/songs',
    resource_type: 'auto',
    allowed_formats: ['mp3', 'wav']
  }
});

const videoStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'presence/videos',
    resource_type: 'video',
    allowed_formats: ['mp4', 'webm', 'mov']
  }
});

module.exports = {
  cloudinary,
  musicStorage,
  videoStorage
};
