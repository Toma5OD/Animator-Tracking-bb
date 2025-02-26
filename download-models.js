const fs = require('fs');
const path = require('path');
const https = require('https');

// Create models directory if it doesn't exist
const modelsDir = path.join(__dirname, 'models');
const faceDetectionDir = path.join(modelsDir, 'tiny_face_detector');

// Create the directories if they don't exist
if (!fs.existsSync(modelsDir)) {
    fs.mkdirSync(modelsDir, { recursive: true });
}
if (!fs.existsSync(faceDetectionDir)) {
    fs.mkdirSync(faceDetectionDir, { recursive: true });
}

// Model files to download
const modelFiles = [
    {
        url: 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/tiny_face_detector_model-weights_manifest.json',
        path: path.join(modelsDir, 'tiny_face_detector_model-weights_manifest.json')
    },
    {
        url: 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/tiny_face_detector/model.json',
        path: path.join(faceDetectionDir, 'model.json')
    },
    {
        url: 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/tiny_face_detector/weights_manifest.json',
        path: path.join(faceDetectionDir, 'weights_manifest.json')
    },
    {
        url: 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/tiny_face_detector/weights_bin.bin',
        path: path.join(faceDetectionDir, 'weights_bin.bin')
    },
    {
        url: 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_landmark_68_model-weights_manifest.json',
        path: path.join(modelsDir, 'face_landmark_68_model-weights_manifest.json')
    },
    {
        url: 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_landmark_68_model-shard1',
        path: path.join(modelsDir, 'face_landmark_68_model-shard1')
    },
];

// Download each file
modelFiles.forEach(file => {
    console.log(`Downloading ${file.url}...`);
    
    const fileStream = fs.createWriteStream(file.path);
    
    https.get(file.url, response => {
        response.pipe(fileStream);
        
        fileStream.on('finish', () => {
            fileStream.close();
            console.log(`Downloaded: ${file.path}`);
        });
    }).on('error', err => {
        fs.unlink(file.path);
        console.error(`Error downloading ${file.url}: ${err.message}`);
    });
});

console.log('All downloads initiated. Please wait for completion messages.');