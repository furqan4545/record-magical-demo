// content.js

// let recorder = null;
// let isRecording = false;
// let mediaStream = null;
// let includeAudio = true;

// let uploadUrl = null;
// let baseBlobUrl = null;
// let sasToken = null;
// let blockIds = [];
// let blockCount = 0;
// let blockUploadPromises = [];
// let displayStream = null; // Added to track display stream separately
// let audioStream = null; // Added to track audio stream separately

// function handleStreamEnded() {
//   if (isRecording) {
//     stopRecording();
//     chrome.runtime.sendMessage({ action: "stopRecording" });
//   }
// }

// chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
//   if (message.action === "startRecording") {
//     if (isRecording) {
//       sendResponse({ success: false, error: "Already recording." });
//       return;
//     }
//     includeAudio = message.includeAudio;

//     try {
//       await startRecording();
//       sendResponse({ success: true });

//       isRecording = true;
//       chrome.runtime.sendMessage({
//         action: "startRecording",
//         recordingTabId: message.recordingTabId,
//       });

//       chrome.runtime.sendMessage({
//         action: "updateBadge",
//         text: "REC",
//       });
//     } catch (error) {
//       console.error("Error starting recording:", error);
//       chrome.runtime.sendMessage({ action: "stopRecording" });
//       chrome.runtime.sendMessage({
//         action: "updateBadge",
//         text: "",
//       });
//       sendResponse({ success: false, error: error.message });
//     }
//     return true;
//   }

//   if (message.action === "stopRecording") {
//     if (isRecording) {
//       await stopRecording();
//       sendResponse({ success: true });
//     } else {
//       sendResponse({ success: false, error: "Not recording." });
//     }
//     return true;
//   }
// });

// async function startRecording() {
//   try {
//     const displayMediaOptions = {
//       video: true,
//       audio: includeAudio,
//     };

//     displayStream = await navigator.mediaDevices.getDisplayMedia(
//       displayMediaOptions
//     );

//     displayStream
//       .getVideoTracks()[0]
//       .addEventListener("ended", handleStreamEnded);

//     if (includeAudio) {
//       const hasSystemAudio = displayStream.getAudioTracks().length > 0;

//       // Always get microphone audio
//       audioStream = await navigator.mediaDevices.getUserMedia({
//         audio: true,
//         video: false,
//       });

//       const tracks = [
//         ...displayStream.getVideoTracks(),
//         ...audioStream.getAudioTracks(),
//       ];

//       if (hasSystemAudio) {
//         tracks.push(...displayStream.getAudioTracks());
//       }

//       mediaStream = new MediaStream(tracks);
//     } else {
//       mediaStream = displayStream;
//     }

//     uploadUrl = await getUploadUrl();
//     const [baseUrl, sas] = uploadUrl.split("?");
//     baseBlobUrl = baseUrl;
//     sasToken = sas;

//     blockIds = [];
//     blockCount = 0;
//     blockUploadPromises = [];

//     const options = {
//       mimeType: "video/webm; codecs=vp8,opus",
//       videoBitsPerSecond: 2500000,
//       audioBitsPerSecond: 128000,
//     };

//     recorder = new MediaRecorder(mediaStream, options);

//     recorder.ondataavailable = handleDataAvailable;
//     recorder.onerror = handleRecordingError;
//     recorder.onstop = handleRecordingStopped;

//     recorder.start(1000);
//     console.log("Screen recording started successfully");
//   } catch (error) {
//     console.error("Error during startRecording:", error);
//     chrome.runtime.sendMessage({ action: "stopRecording" });
//     throw error;
//   }
// }

// async function handleDataAvailable(event) {
//   if (event.data && event.data.size > 0) {
//     blockCount++;
//     const blockIdString = "block-" + String(blockCount).padStart(6, "0");
//     const blockId = btoa(blockIdString);
//     blockIds.push(blockId);

//     const blockUrl = `${baseBlobUrl}?comp=block&blockid=${encodeURIComponent(
//       blockId
//     )}&${sasToken}`;

//     const uploadPromise = fetch(blockUrl, {
//       method: "PUT",
//       body: event.data,
//       headers: {
//         "Content-Type": "application/octet-stream",
//       },
//     })
//       .then(async (uploadResponse) => {
//         if (!uploadResponse.ok) {
//           const errorText = await uploadResponse.text();
//           console.error("Block upload error:", errorText);
//           throw new Error("Block upload failed");
//         } else {
//           console.log(
//             `Uploaded block ${blockIdString}, size: ${event.data.size}`
//           );
//         }
//       })
//       .catch(async (error) => {
//         console.error("Error uploading block:", error);
//         await stopRecording();
//       });

//     blockUploadPromises.push(uploadPromise);
//   }
// }

// function handleRecordingError(event) {
//   console.error("Recording error:", event.error);
//   stopRecording();
// }

// async function handleRecordingStopped() {
//   try {
//     await Promise.all(blockUploadPromises);

//     const blockListXml =
//       '<?xml version="1.0" encoding="utf-8"?><BlockList>' +
//       blockIds.map((id) => `<Latest>${id}</Latest>`).join("") +
//       "</BlockList>";

//     const blockListUrl = `${baseBlobUrl}?comp=blocklist&${sasToken}`;

//     const commitResponse = await fetch(blockListUrl, {
//       method: "PUT",
//       body: blockListXml,
//       headers: {
//         "Content-Type": "application/xml",
//       },
//     });

//     if (!commitResponse.ok) {
//       const errorText = await commitResponse.text();
//       console.error("Block list commit error:", errorText);
//       throw new Error("Failed to commit block list");
//     }

//     console.log("Block list committed successfully");

//     chrome.runtime.sendMessage({
//       action: "recordingStopped",
//       downloadUrl: `${baseBlobUrl}?${sasToken}`,
//     });

//     chrome.runtime.sendMessage({
//       action: "updateBadge",
//       text: "",
//     });

//     isRecording = false;
//   } catch (error) {
//     console.error("Error finalizing recording:", error);
//     isRecording = false;
//   }
// }

// async function stopRecording() {
//   console.log("Stopping recording");

//   // Stop MediaRecorder
//   if (recorder && recorder.state !== "inactive") {
//     recorder.stop();
//   }

//   // Stop all tracks in the combined mediaStream
//   if (mediaStream) {
//     mediaStream.getTracks().forEach((track) => {
//       track.removeEventListener("ended", handleStreamEnded);
//       track.stop();
//     });
//     mediaStream = null;
//   }

//   // Stop display stream tracks
//   if (displayStream) {
//     displayStream.getTracks().forEach((track) => {
//       track.removeEventListener("ended", handleStreamEnded);
//       track.stop();
//     });
//     displayStream = null;
//   }

//   // Stop audio stream tracks
//   if (audioStream) {
//     audioStream.getTracks().forEach((track) => track.stop());
//     audioStream = null;
//   }

//   recorder = null;
//   isRecording = false;

//   chrome.runtime.sendMessage({ action: "stopRecording" });
//   chrome.runtime.sendMessage({
//     action: "updateBadge",
//     text: "",
//   });
// }

// async function getUploadUrl() {
//   try {
//     const response = await fetch("http://localhost:3500/get-sas-token");
//     if (!response.ok) {
//       throw new Error("Failed to obtain SAS token");
//     }
//     const data = await response.json();
//     console.log("Received upload URL:", data.uploadUrl);
//     return data.uploadUrl;
//   } catch (error) {
//     console.error("Error obtaining upload URL:", error);
//     throw error;
//   }
// }

//////////////////////////////////////////////////////////////
/////////// aws working code #########################################

// let recorder = null;
// let isRecording = false;
// let mediaStream = null;
// let includeAudio = true;

// let uploadId = null;
// let videoKey = null;
// let displayStream = null;
// let micStream = null;
// let audioContext = null;
// let mixedAudioStream = null;

// const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB
// let currentChunks = [];
// let currentChunkSize = 0;
// let partNumber = 1;
// let uploadedParts = [];

// // Initialize the upload queue
// let uploadQueue = Promise.resolve();

// // Upload a single chunk
// async function uploadChunk(chunks, partNum) {
//   if (chunks.length === 0) {
//     console.error(`Attempted to upload empty chunk for part ${partNum}`);
//     throw new Error(`Empty chunk for part ${partNum}`);
//   }

//   try {
//     // Create blob from accumulated chunks
//     const blob = new Blob(chunks, { type: "video/webm" });
//     console.log(`Uploading part ${partNum}, blob size: ${blob.size} bytes`);

//     const response = await fetch("http://localhost:3500/get-part-url", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({
//         uploadId,
//         partNumber: partNum,
//         key: videoKey,
//       }),
//     });

//     if (!response.ok) throw new Error("Failed to get upload URL");
//     const { presignedUrl } = await response.json();

//     const uploadResponse = await fetch(presignedUrl, {
//       method: "PUT",
//       body: blob,
//     });

//     if (!uploadResponse.ok) throw new Error(`Failed to upload part ${partNum}`);

//     const ETag = uploadResponse.headers.get("ETag");
//     if (!ETag) {
//       throw new Error(`Missing ETag for part ${partNum}`);
//     }

//     uploadedParts.push({
//       PartNumber: partNum,
//       ETag: ETag.replace(/"/g, ""),
//     });

//     console.log(`Successfully uploaded part ${partNum}, ETag: ${ETag}`);
//     return true;
//   } catch (error) {
//     console.error(`Error uploading part ${partNum}:`, error);
//     throw error;
//   }
// }

// // // Function to mix audio streams using Web Audio API
// function mixAudioStreams(tabAudioStream, micAudioStream) {
//   audioContext = new (window.AudioContext || window.webkitAudioContext)();

//   // Create source nodes for each audio stream
//   const tabSource = audioContext.createMediaStreamSource(tabAudioStream);
//   const micSource = audioContext.createMediaStreamSource(micAudioStream);

//   // Create a destination node
//   const destination = audioContext.createMediaStreamDestination();

//   // Connect sources to the destination
//   tabSource.connect(destination);
//   micSource.connect(destination);

//   mixedAudioStream = destination.stream;

//   return mixedAudioStream;
// }

// async function startRecording() {
//   try {
//     const displayMediaOptions = {
//       video: true,
//       audio: includeAudio,
//     };

//     displayStream = await navigator.mediaDevices.getDisplayMedia(
//       displayMediaOptions
//     );
//     displayStream
//       .getVideoTracks()[0]
//       .addEventListener("ended", handleStreamEnded);
//     mediaStream = displayStream;

//     if (includeAudio) {
//       try {
//         // Capture microphone audio
//         micStream = await navigator.mediaDevices.getUserMedia({
//           audio: true,
//           video: false,
//         });

//         //////////////////////////////////////////////////////////////
//         // Check if displayStream has audio tracks
//         const hasSystemAudio = displayStream.getAudioTracks().length > 0;

//         if (hasSystemAudio) {
//           // Mix system/tab audio with microphone audio
//           mixedAudioStream = mixAudioStreams(displayStream, micStream);
//           console.log("Mixed system/tab audio with microphone audio.");
//         } else {
//           // If no system/tab audio, use only microphone audio
//           mixedAudioStream = micStream;
//           console.warn(
//             "No system/tab audio tracks found. Recording only microphone audio."
//           );
//           // Optionally, notify the user without using alert
//           // alert("System/tab audio is not captured. Please ensure 'Share audio' is enabled when sharing your screen.");
//         }

//         // Combine video with mixed audio
//         mediaStream = new MediaStream([
//           ...displayStream.getVideoTracks(),
//           ...mixedAudioStream.getAudioTracks(),
//         ]);
//       } catch (audioError) {
//         console.warn(
//           "Audio access denied, continuing without audio:",
//           audioError
//         );
//         alert(
//           "Audio access denied. Recording will continue without microphone audio."
//         );
//       }
//     }

//     // Initialize upload
//     const initResponse = await fetch("http://localhost:3500/init-multipart", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({
//         fileName: `recording-${Date.now()}.webm`,
//       }),
//     });

//     if (!initResponse.ok) throw new Error("Failed to initialize upload");
//     const { uploadId: newUploadId, key } = await initResponse.json();
//     uploadId = newUploadId;
//     videoKey = key;

//     // Reset upload state
//     currentChunks = [];
//     currentChunkSize = 0;
//     partNumber = 1;
//     uploadedParts = [];

//     recorder = new MediaRecorder(mediaStream, {
//       mimeType: "video/webm;codecs=vp8,opus",
//       videoBitsPerSecond: 2500000,
//       audioBitsPerSecond: 128000,
//     });

//     recorder.ondataavailable = (event) => {
//       if (event.data.size > 0) {
//         currentChunks.push(event.data);
//         currentChunkSize += event.data.size;

//         // Upload when we reach chunk size
//         if (currentChunkSize >= CHUNK_SIZE) {
//           const currentPartNumber = partNumber++;
//           const chunksToUpload = [...currentChunks]; // Create a shallow copy
//           currentChunks = [];
//           currentChunkSize = 0;

//           // Add the upload to the queue
//           uploadQueue = uploadQueue
//             .then(() => uploadChunk(chunksToUpload, currentPartNumber))
//             .catch((error) => {
//               console.error(
//                 `Failed to upload part ${currentPartNumber}:`,
//                 error
//               );
//               // Optionally, handle retries or abort recording
//             });
//         }
//       }
//     };

//     recorder.onstop = async () => {
//       try {
//         // Upload any remaining chunks
//         if (currentChunks.length > 0) {
//           const finalPartNumber = partNumber++;
//           const chunksToUpload = [...currentChunks];
//           currentChunks = [];
//           currentChunkSize = 0;

//           // Add the final upload to the queue
//           uploadQueue = uploadQueue
//             .then(() => uploadChunk(chunksToUpload, finalPartNumber))
//             .catch((error) => {
//               console.error(`Failed to upload part ${finalPartNumber}:`, error);
//               // Optionally, handle retries or abort recording
//             });
//         }

//         // Wait for all uploads in the queue to complete
//         await uploadQueue;

//         // Complete the multipart upload
//         const completeResponse = await fetch(
//           "http://localhost:3500/complete-multipart",
//           {
//             method: "POST",
//             headers: { "Content-Type": "application/json" },
//             body: JSON.stringify({
//               uploadId,
//               key: videoKey,
//               parts: uploadedParts.sort((a, b) => a.PartNumber - b.PartNumber),
//             }),
//           }
//         );

//         if (!completeResponse.ok) throw new Error("Failed to complete upload");
//         console.log("Upload completed successfully");

//         // Open video player
//         chrome.runtime.sendMessage({
//           action: "openVideoPlayer",
//           url: chrome.runtime.getURL(
//             `player.html?key=${encodeURIComponent(videoKey)}`
//           ),
//         });
//       } catch (error) {
//         console.error("Error uploading recording:", error);
//       } finally {
//         // Clear the recording state
//         chrome.storage.local.set({ isRecording: false });
//         // Clear the badge
//         chrome.runtime.sendMessage({
//           action: "updateBadge",
//           text: "",
//         });
//         isRecording = false;
//       }
//     };

//     // Start recording and create chunks every second
//     recorder.start(1000);
//     console.log("Recording started");

//     // Set recording state to true
//     chrome.storage.local.set({ isRecording: true });

//     chrome.runtime.sendMessage({
//       action: "updateBadge",
//       text: "REC",
//       color: "#FF0000",
//     });

//     isRecording = true;
//   } catch (error) {
//     console.error("Error starting recording:", error);
//     chrome.runtime.sendMessage({ action: "stopRecording" });
//     chrome.storage.local.set({ isRecording: false });
//     throw error;
//   }
// }

// function handleStreamEnded() {
//   if (isRecording) {
//     stopRecording();
//     chrome.runtime.sendMessage({ action: "stopRecording" });
//   }
// }

// async function stopRecording() {
//   console.log("Stopping recording");

//   if (recorder && recorder.state !== "inactive") {
//     recorder.stop();
//   }

//   if (mediaStream) {
//     mediaStream.getTracks().forEach((track) => {
//       track.removeEventListener("ended", handleStreamEnded);
//       track.stop();
//     });
//     mediaStream = null;
//   }

//   if (displayStream) {
//     displayStream.getTracks().forEach((track) => {
//       track.removeEventListener("ended", handleStreamEnded);
//       track.stop();
//     });
//     displayStream = null;
//   }

//   if (micStream) {
//     micStream.getTracks().forEach((track) => track.stop());
//     micStream = null;
//   }

//   if (audioContext) {
//     audioContext.close().catch((error) => {
//       console.error("Error closing AudioContext:", error);
//     });
//     audioContext = null;
//   }

//   if (mixedAudioStream && mixedAudioStream !== micStream) {
//     mixedAudioStream.getTracks().forEach((track) => track.stop());
//     mixedAudioStream = null;
//   }

//   recorder = null;
//   isRecording = false;

//   // Clear the recording state in storage
//   chrome.storage.local.set({ isRecording: false });

//   chrome.runtime.sendMessage({ action: "stopRecording" });
//   chrome.runtime.sendMessage({
//     action: "updateBadge",
//     text: "",
//   });
// }

// // Message listener
// chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
//   if (message.action === "startRecording") {
//     if (isRecording) {
//       sendResponse({ success: false, error: "Already recording" });
//       return true;
//     }
//     includeAudio = message.includeAudio;

//     startRecording()
//       .then(() => {
//         sendResponse({ success: true });
//       })
//       .catch((error) => {
//         console.error(error);
//         sendResponse({ success: false, error: error.message });
//       });

//     return true;
//   }

//   if (message.action === "stopRecording") {
//     if (isRecording) {
//       stopRecording();
//       sendResponse({ success: true });
//     } else {
//       sendResponse({ success: false, error: "Not recording" });
//     }
//     return true;
//   }

//   return true;
// });

//////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////
/////////// aws working code #########################################

// let recorder = null;
// let isRecording = false;
// let mediaStream = null;
// let includeAudio = true;

// let uploadId = null;
// let videoKey = null;
// let displayStream = null;
// let micStream = null;
// let audioContext = null;
// let mixedAudioStream = null;

// const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB
// let currentChunks = [];
// let currentChunkSize = 0;
// let partNumber = 1;
// let uploadedParts = [];

// // Initialize the upload queue
// let uploadQueue = Promise.resolve();

// // Upload a single chunk
// async function uploadChunk(chunks, partNum) {
//   if (chunks.length === 0) {
//     console.error(`Attempted to upload empty chunk for part ${partNum}`);
//     throw new Error(`Empty chunk for part ${partNum}`);
//   }

//   try {
//     // Create blob from accumulated chunks
//     const blob = new Blob(chunks, { type: "video/webm" });
//     console.log(`Uploading part ${partNum}, blob size: ${blob.size} bytes`);

//     const response = await fetch("http://localhost:3500/get-part-url", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({
//         uploadId,
//         partNumber: partNum,
//         key: videoKey,
//       }),
//     });

//     if (!response.ok) throw new Error("Failed to get upload URL");
//     const { presignedUrl } = await response.json();

//     const uploadResponse = await fetch(presignedUrl, {
//       method: "PUT",
//       body: blob,
//     });

//     if (!uploadResponse.ok) throw new Error(`Failed to upload part ${partNum}`);

//     const ETag = uploadResponse.headers.get("ETag");
//     if (!ETag) {
//       throw new Error(`Missing ETag for part ${partNum}`);
//     }

//     uploadedParts.push({
//       PartNumber: partNum,
//       ETag: ETag.replace(/"/g, ""),
//     });

//     console.log(`Successfully uploaded part ${partNum}, ETag: ${ETag}`);
//     return true;
//   } catch (error) {
//     console.error(`Error uploading part ${partNum}:`, error);
//     throw error;
//   }
// }

// // // Function to mix audio streams using Web Audio API
// function mixAudioStreams(tabAudioStream, micAudioStream) {
//   audioContext = new (window.AudioContext || window.webkitAudioContext)();

//   // Create source nodes for each audio stream
//   const tabSource = audioContext.createMediaStreamSource(tabAudioStream);
//   const micSource = audioContext.createMediaStreamSource(micAudioStream);

//   // Create a destination node
//   const destination = audioContext.createMediaStreamDestination();

//   // Connect sources to the destination
//   tabSource.connect(destination);
//   micSource.connect(destination);

//   mixedAudioStream = destination.stream;

//   return mixedAudioStream;
// }

// // Add this function at the top with your other functions
// async function getMicrophonePermission() {
//   if (!includeAudio) return null;

//   try {
//     // Request microphone access
//     const stream = await navigator.mediaDevices.getUserMedia({
//       audio: true,
//       video: false,
//     });

//     // If successful, stop the temporary stream since we'll request it again during recording
//     stream.getTracks().forEach((track) => track.stop());
//     return true;
//   } catch (error) {
//     console.warn("Microphone permission denied:", error);
//     return false;
//   }
// }

// async function startRecording() {
//   try {
//     if (includeAudio) {
//       const micPermission = await getMicrophonePermission();
//       if (micPermission === false) {
//         // User denied mic access, ask if they want to continue without mic
//         if (
//           !confirm(
//             "Microphone access was denied. Continue recording without microphone?"
//           )
//         ) {
//           throw new Error(
//             "Recording cancelled due to microphone permission denial"
//           );
//         }
//         // If they continue, disable audio recording
//         includeAudio = false;
//       }
//     }

//     const displayMediaOptions = {
//       video: true,
//       audio: includeAudio,
//     };

//     displayStream = await navigator.mediaDevices.getDisplayMedia(
//       displayMediaOptions
//     );

//     displayStream
//       .getVideoTracks()[0]
//       .addEventListener("ended", handleStreamEnded);
//     mediaStream = displayStream;

//     if (
//       displayStream.getVideoTracks()[0].label.toLowerCase().includes("screen")
//     ) {
//       window.addEventListener("beforeunload", function (e) {
//         if (isRecording) {
//           e.preventDefault();
//           // Modern browsers standardized on showing a generic message
//           // regardless of the string returned
//           return "Recording in progress. Are you sure you want to leave?";
//         }
//       });
//     }

//     if (includeAudio) {
//       try {
//         // Capture microphone audio
//         micStream = await navigator.mediaDevices.getUserMedia({
//           audio: true,
//           video: false,
//         });
//         const hasSystemAudio = displayStream.getAudioTracks().length > 0;
//         if (hasSystemAudio) {
//           // Mix system/tab audio with microphone audio
//           mixedAudioStream = mixAudioStreams(displayStream, micStream);
//           console.log("Mixed system/tab audio with microphone audio.");
//         } else {
//           // If no system/tab audio, use only microphone audio
//           mixedAudioStream = micStream;
//           console.warn(
//             "No system/tab audio tracks found. Recording only microphone audio."
//           );
//           // Optionally, notify the user without using alert
//           // alert("System/tab audio is not captured. Please ensure 'Share audio' is enabled when sharing your screen.");
//         }
//         // Combine video with mixed audio
//         mediaStream = new MediaStream([
//           ...displayStream.getVideoTracks(),
//           ...mixedAudioStream.getAudioTracks(),
//         ]);
//       } catch (audioError) {
//         console.warn(
//           "Audio access denied, continuing without audio:",
//           audioError
//         );
//         alert(
//           "Audio access denied. Recording will continue without microphone audio."
//         );
//       }
//     }

//     // Initialize upload
//     const initResponse = await fetch("http://localhost:3500/init-multipart", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({
//         fileName: `recording-${Date.now()}.webm`,
//       }),
//     });

//     if (!initResponse.ok) throw new Error("Failed to initialize upload");
//     const { uploadId: newUploadId, key } = await initResponse.json();
//     uploadId = newUploadId;
//     videoKey = key;

//     // Reset upload state
//     currentChunks = [];
//     currentChunkSize = 0;
//     partNumber = 1;
//     uploadedParts = [];

//     recorder = new MediaRecorder(mediaStream, {
//       mimeType: "video/webm;codecs=vp8,opus",
//       videoBitsPerSecond: 2500000,
//       audioBitsPerSecond: 128000,
//     });

//     recorder.ondataavailable = (event) => {
//       if (event.data.size > 0) {
//         currentChunks.push(event.data);
//         currentChunkSize += event.data.size;

//         // Upload when we reach chunk size
//         if (currentChunkSize >= CHUNK_SIZE) {
//           const currentPartNumber = partNumber++;
//           const chunksToUpload = [...currentChunks]; // Create a shallow copy
//           currentChunks = [];
//           currentChunkSize = 0;

//           // Add the upload to the queue
//           uploadQueue = uploadQueue
//             .then(() => uploadChunk(chunksToUpload, currentPartNumber))
//             .catch((error) => {
//               console.error(
//                 `Failed to upload part ${currentPartNumber}:`,
//                 error
//               );
//               // Optionally, handle retries or abort recording
//             });
//         }
//       }
//     };

//     recorder.onstop = async () => {
//       try {
//         // Upload any remaining chunks
//         if (currentChunks.length > 0) {
//           const finalPartNumber = partNumber++;
//           const chunksToUpload = [...currentChunks];
//           currentChunks = [];
//           currentChunkSize = 0;

//           // Add the final upload to the queue
//           uploadQueue = uploadQueue
//             .then(() => uploadChunk(chunksToUpload, finalPartNumber))
//             .catch((error) => {
//               console.error(`Failed to upload part ${finalPartNumber}:`, error);
//               // Optionally, handle retries or abort recording
//             });
//         }

//         // Wait for all uploads in the queue to complete
//         await uploadQueue;

//         // Complete the multipart upload
//         const completeResponse = await fetch(
//           "http://localhost:3500/complete-multipart",
//           {
//             method: "POST",
//             headers: { "Content-Type": "application/json" },
//             body: JSON.stringify({
//               uploadId,
//               key: videoKey,
//               parts: uploadedParts.sort((a, b) => a.PartNumber - b.PartNumber),
//             }),
//           }
//         );

//         if (!completeResponse.ok) throw new Error("Failed to complete upload");
//         console.log("Upload completed successfully");

//         // Open video player
//         chrome.runtime.sendMessage({
//           action: "openVideoPlayer",
//           url: chrome.runtime.getURL(
//             `player.html?key=${encodeURIComponent(videoKey)}`
//           ),
//         });
//       } catch (error) {
//         console.error("Error uploading recording:", error);
//       } finally {
//         // Clear the recording state
//         chrome.storage.local.set({ isRecording: false });
//         // Clear the badge
//         chrome.runtime.sendMessage({
//           action: "updateBadge",
//           text: "",
//         });
//         isRecording = false;
//       }
//     };

//     // Start recording and create chunks every second
//     recorder.start(1000);
//     console.log("Recording started");

//     // Set recording state to true
//     chrome.storage.local.set({ isRecording: true });

//     chrome.runtime.sendMessage({
//       action: "updateBadge",
//       text: "REC",
//       color: "#FF0000",
//     });

//     isRecording = true;
//   } catch (error) {
//     console.error("Error starting recording:", error);
//     chrome.runtime.sendMessage({ action: "stopRecording" });
//     chrome.storage.local.set({ isRecording: false });
//     throw error;
//   }
// }

// function handleStreamEnded() {
//   if (isRecording) {
//     stopRecording();
//     chrome.runtime.sendMessage({ action: "stopRecording" });
//   }
// }

// async function stopRecording() {
//   console.log("Stopping recording");

//   if (recorder && recorder.state !== "inactive") {
//     recorder.stop();
//   }

//   if (mediaStream) {
//     mediaStream.getTracks().forEach((track) => {
//       track.removeEventListener("ended", handleStreamEnded);
//       track.stop();
//     });
//     mediaStream = null;
//   }

//   if (displayStream) {
//     displayStream.getTracks().forEach((track) => {
//       track.removeEventListener("ended", handleStreamEnded);
//       track.stop();
//     });
//     displayStream = null;
//   }

//   if (micStream) {
//     micStream.getTracks().forEach((track) => track.stop());
//     micStream = null;
//   }

//   if (audioContext) {
//     audioContext.close().catch((error) => {
//       console.error("Error closing AudioContext:", error);
//     });
//     audioContext = null;
//   }

//   if (mixedAudioStream && mixedAudioStream !== micStream) {
//     mixedAudioStream.getTracks().forEach((track) => track.stop());
//     mixedAudioStream = null;
//   }

//   // Remove the beforeunload listener
//   window.removeEventListener("beforeunload", function (e) {
//     if (isRecording) {
//       e.preventDefault();
//       // e.returnValue =
//       //   "Recording in progress. If you leave, your recording will be lost. Are you sure?";
//       // return e.returnValue;
//       return "Recording in progress. Are you sure you want to leave?";
//     }
//   });

//   recorder = null;
//   isRecording = false;

//   // Clear the recording state in storage
//   chrome.storage.local.set({ isRecording: false });

//   chrome.runtime.sendMessage({ action: "stopRecording" });
//   chrome.runtime.sendMessage({
//     action: "updateBadge",
//     text: "",
//   });
// }

// // Message listener
// chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
//   if (message.action === "startRecording") {
//     if (isRecording) {
//       sendResponse({ success: false, error: "Already recording" });
//       return true;
//     }
//     includeAudio = message.includeAudio;

//     startRecording()
//       .then(() => {
//         sendResponse({ success: true });
//       })
//       .catch((error) => {
//         console.error(error);
//         sendResponse({ success: false, error: error.message });
//       });

//     return true;
//   }

//   if (message.action === "stopRecording") {
//     if (isRecording) {
//       stopRecording();
//       sendResponse({ success: true });
//     } else {
//       sendResponse({ success: false, error: "Not recording" });
//     }
//     return true;
//   }

//   return true;
// });

//////////////////////////////////////////////////////////////
// working code with one tab share issue resolved.

// let recorder = null;
// let isRecording = false;
// let mediaStream = null;
// let includeAudio = true;

// let uploadId = null;
// let videoKey = null;
// let displayStream = null;
// let micStream = null;
// let audioContext = null;
// let mixedAudioStream = null;

// const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB
// let currentChunks = [];
// let currentChunkSize = 0;
// let partNumber = 1;
// let uploadedParts = [];

// // Initialize the upload queue
// let uploadQueue = Promise.resolve();

// // Upload a single chunk
// async function uploadChunk(chunks, partNum) {
//   if (chunks.length === 0) {
//     console.error(`Attempted to upload empty chunk for part ${partNum}`);
//     throw new Error(`Empty chunk for part ${partNum}`);
//   }

//   try {
//     // Create blob from accumulated chunks
//     const blob = new Blob(chunks, { type: "video/webm" });
//     console.log(`Uploading part ${partNum}, blob size: ${blob.size} bytes`);

//     const response = await fetch("http://localhost:3500/get-part-url", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({
//         uploadId,
//         partNumber: partNum,
//         key: videoKey,
//       }),
//     });

//     if (!response.ok) throw new Error("Failed to get upload URL");
//     const { presignedUrl } = await response.json();

//     const uploadResponse = await fetch(presignedUrl, {
//       method: "PUT",
//       body: blob,
//     });

//     if (!uploadResponse.ok) throw new Error(`Failed to upload part ${partNum}`);

//     const ETag = uploadResponse.headers.get("ETag");
//     if (!ETag) {
//       throw new Error(`Missing ETag for part ${partNum}`);
//     }

//     uploadedParts.push({
//       PartNumber: partNum,
//       ETag: ETag.replace(/"/g, ""),
//     });

//     console.log(`Successfully uploaded part ${partNum}, ETag: ${ETag}`);
//     return true;
//   } catch (error) {
//     console.error(`Error uploading part ${partNum}:`, error);
//     throw error;
//   }
// }

// // // Function to mix audio streams using Web Audio API
// function mixAudioStreams(tabAudioStream, micAudioStream) {
//   audioContext = new (window.AudioContext || window.webkitAudioContext)();

//   // Create source nodes for each audio stream
//   const tabSource = audioContext.createMediaStreamSource(tabAudioStream);
//   const micSource = audioContext.createMediaStreamSource(micAudioStream);

//   // Create a destination node
//   const destination = audioContext.createMediaStreamDestination();

//   // Connect sources to the destination
//   tabSource.connect(destination);
//   micSource.connect(destination);

//   mixedAudioStream = destination.stream;

//   return mixedAudioStream;
// }

// // Add this function at the top with your other functions
// async function getMicrophonePermission() {
//   if (!includeAudio) return null;

//   try {
//     // Request microphone access
//     const stream = await navigator.mediaDevices.getUserMedia({
//       audio: true,
//       video: false,
//     });

//     // If successful, stop the temporary stream since we'll request it again during recording
//     stream.getTracks().forEach((track) => track.stop());
//     return true;
//   } catch (error) {
//     console.warn("Microphone permission denied:", error);
//     return false;
//   }
// }

// async function startRecording() {
//   try {
//     if (includeAudio) {
//       const micPermission = await getMicrophonePermission();
//       if (micPermission === false) {
//         // User denied mic access, ask if they want to continue without mic
//         if (
//           !confirm(
//             "Microphone access was denied. Continue recording without microphone?"
//           )
//         ) {
//           throw new Error(
//             "Recording cancelled due to microphone permission denial"
//           );
//         }
//         // If they continue, disable audio recording
//         includeAudio = false;
//       }
//     }

//     const displayMediaOptions = {
//       video: true,
//       audio: includeAudio,
//     };

//     displayStream = await navigator.mediaDevices.getDisplayMedia(
//       displayMediaOptions
//     );

//     displayStream
//       .getVideoTracks()[0]
//       .addEventListener("ended", handleStreamEnded);
//     mediaStream = displayStream;

//     if (
//       displayStream.getVideoTracks()[0].label.toLowerCase().includes("screen")
//     ) {
//       window.addEventListener("beforeunload", function (e) {
//         if (isRecording) {
//           e.preventDefault();
//           // Modern browsers standardized on showing a generic message
//           // regardless of the string returned
//           return "Recording in progress. Are you sure you want to leave?";
//         }
//       });
//     }

//     if (includeAudio) {
//       try {
//         // Capture microphone audio
//         micStream = await navigator.mediaDevices.getUserMedia({
//           audio: true,
//           video: false,
//         });
//         const hasSystemAudio = displayStream.getAudioTracks().length > 0;
//         if (hasSystemAudio) {
//           // Mix system/tab audio with microphone audio
//           mixedAudioStream = mixAudioStreams(displayStream, micStream);
//           console.log("Mixed system/tab audio with microphone audio.");
//         } else {
//           // If no system/tab audio, use only microphone audio
//           mixedAudioStream = micStream;
//           console.warn(
//             "No system/tab audio tracks found. Recording only microphone audio."
//           );
//           // Optionally, notify the user without using alert
//           // alert("System/tab audio is not captured. Please ensure 'Share audio' is enabled when sharing your screen.");
//         }
//         // Combine video with mixed audio
//         mediaStream = new MediaStream([
//           ...displayStream.getVideoTracks(),
//           ...mixedAudioStream.getAudioTracks(),
//         ]);
//       } catch (audioError) {
//         console.warn(
//           "Audio access denied, continuing without audio:",
//           audioError
//         );
//         alert(
//           "Audio access denied. Recording will continue without microphone audio."
//         );
//       }
//     }

//     // Initialize upload
//     const initResponse = await fetch("http://localhost:3500/init-multipart", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({
//         fileName: `recording-${Date.now()}.webm`,
//       }),
//     });

//     if (!initResponse.ok) throw new Error("Failed to initialize upload");
//     const { uploadId: newUploadId, key } = await initResponse.json();
//     uploadId = newUploadId;
//     videoKey = key;

//     // Reset upload state
//     currentChunks = [];
//     currentChunkSize = 0;
//     partNumber = 1;
//     uploadedParts = [];

//     recorder = new MediaRecorder(mediaStream, {
//       mimeType: "video/webm;codecs=vp8,opus",
//       videoBitsPerSecond: 2500000,
//       audioBitsPerSecond: 128000,
//     });

//     recorder.ondataavailable = (event) => {
//       if (event.data.size > 0) {
//         currentChunks.push(event.data);
//         currentChunkSize += event.data.size;

//         // Upload when we reach chunk size
//         if (currentChunkSize >= CHUNK_SIZE) {
//           const currentPartNumber = partNumber++;
//           const chunksToUpload = [...currentChunks]; // Create a shallow copy
//           currentChunks = [];
//           currentChunkSize = 0;

//           // Add the upload to the queue
//           uploadQueue = uploadQueue
//             .then(() => uploadChunk(chunksToUpload, currentPartNumber))
//             .catch((error) => {
//               console.error(
//                 `Failed to upload part ${currentPartNumber}:`,
//                 error
//               );
//               // Optionally, handle retries or abort recording
//             });
//         }
//       }
//     };

//     recorder.onstop = async () => {
//       try {
//         // Upload any remaining chunks
//         if (currentChunks.length > 0) {
//           const finalPartNumber = partNumber++;
//           const chunksToUpload = [...currentChunks];
//           currentChunks = [];
//           currentChunkSize = 0;

//           // Add the final upload to the queue
//           uploadQueue = uploadQueue
//             .then(() => uploadChunk(chunksToUpload, finalPartNumber))
//             .catch((error) => {
//               console.error(`Failed to upload part ${finalPartNumber}:`, error);
//               // Optionally, handle retries or abort recording
//             });
//         }

//         // Wait for all uploads in the queue to complete
//         await uploadQueue;

//         // Complete the multipart upload
//         const completeResponse = await fetch(
//           "http://localhost:3500/complete-multipart",
//           {
//             method: "POST",
//             headers: { "Content-Type": "application/json" },
//             body: JSON.stringify({
//               uploadId,
//               key: videoKey,
//               parts: uploadedParts.sort((a, b) => a.PartNumber - b.PartNumber),
//             }),
//           }
//         );

//         if (!completeResponse.ok) throw new Error("Failed to complete upload");
//         console.log("Upload completed successfully");

//         // Open video player
//         chrome.runtime.sendMessage({
//           action: "openVideoPlayer",
//           url: chrome.runtime.getURL(
//             `player.html?key=${encodeURIComponent(videoKey)}`
//           ),
//         });
//       } catch (error) {
//         console.error("Error uploading recording:", error);
//       } finally {
//         // Clear the recording state
//         chrome.storage.local.set({ isRecording: false });
//         // Clear the badge
//         chrome.runtime.sendMessage({
//           action: "updateBadge",
//           text: "",
//         });
//         isRecording = false;
//       }
//     };

//     // Start recording and create chunks every second
//     recorder.start(1000);
//     console.log("Recording started");

//     // Set recording state to true
//     chrome.storage.local.set({ isRecording: true });

//     chrome.runtime.sendMessage({
//       action: "updateBadge",
//       text: "REC",
//       color: "#FF0000",
//     });

//     isRecording = true;
//   } catch (error) {
//     console.error("Error starting recording:", error);
//     chrome.runtime.sendMessage({ action: "stopRecording" });
//     chrome.storage.local.set({ isRecording: false });
//     throw error;
//   }
// }

// function handleStreamEnded() {
//   if (isRecording) {
//     stopRecording();
//     chrome.runtime.sendMessage({ action: "stopRecording" });
//   }
// }

// async function stopRecording() {
//   console.log("Stopping recording");

//   if (recorder && recorder.state !== "inactive") {
//     recorder.stop();
//   }

//   if (mediaStream) {
//     mediaStream.getTracks().forEach((track) => {
//       track.removeEventListener("ended", handleStreamEnded);
//       track.stop();
//     });
//     mediaStream = null;
//   }

//   if (displayStream) {
//     displayStream.getTracks().forEach((track) => {
//       track.removeEventListener("ended", handleStreamEnded);
//       track.stop();
//     });
//     displayStream = null;
//   }

//   if (micStream) {
//     micStream.getTracks().forEach((track) => track.stop());
//     micStream = null;
//   }

//   if (audioContext) {
//     audioContext.close().catch((error) => {
//       console.error("Error closing AudioContext:", error);
//     });
//     audioContext = null;
//   }

//   if (mixedAudioStream && mixedAudioStream !== micStream) {
//     mixedAudioStream.getTracks().forEach((track) => track.stop());
//     mixedAudioStream = null;
//   }

//   // Remove the beforeunload listener
//   window.removeEventListener("beforeunload", function (e) {
//     if (isRecording) {
//       e.preventDefault();
//       // e.returnValue =
//       //   "Recording in progress. If you leave, your recording will be lost. Are you sure?";
//       // return e.returnValue;
//       return "Recording in progress. Are you sure you want to leave?";
//     }
//   });

//   recorder = null;
//   isRecording = false;

//   // Clear the recording state in storage
//   chrome.storage.local.set({ isRecording: false });

//   chrome.runtime.sendMessage({ action: "stopRecording" });
//   chrome.runtime.sendMessage({
//     action: "updateBadge",
//     text: "",
//   });
// }

// // Message listener
// chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
//   if (message.action === "startRecording") {
//     if (isRecording) {
//       sendResponse({ success: false, error: "Already recording" });
//       return true;
//     }
//     includeAudio = message.includeAudio;

//     startRecording()
//       .then(() => {
//         sendResponse({ success: true });
//       })
//       .catch((error) => {
//         console.error(error);
//         sendResponse({ success: false, error: error.message });
//       });

//     return true;
//   }

//   if (message.action === "stopRecording") {
//     if (isRecording) {
//       stopRecording();
//       sendResponse({ success: true });
//     } else {
//       sendResponse({ success: false, error: "Not recording" });
//     }
//     return true;
//   }

//   return true;
// });

////////////////////////////////////
// test 4

let recorder = null;
let isRecording = false;
let mediaStream = null;
let includeAudio = true;

let uploadId = null;
let videoKey = null;
let displayStream = null;
let micStream = null;
let audioContext = null;
let mixedAudioStream = null;

const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB
let currentChunks = [];
let currentChunkSize = 0;
let partNumber = 1;
let uploadedParts = [];

// Initialize the upload queue
let uploadQueue = Promise.resolve();

// Upload a single chunk
async function uploadChunk(chunks, partNum) {
  if (chunks.length === 0) {
    console.error(`Attempted to upload empty chunk for part ${partNum}`);
    throw new Error(`Empty chunk for part ${partNum}`);
  }

  try {
    // Create blob from accumulated chunks
    const blob = new Blob(chunks, { type: "video/webm" });
    console.log(`Uploading part ${partNum}, blob size: ${blob.size} bytes`);

    const response = await fetch("http://localhost:3500/get-part-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        uploadId,
        partNumber: partNum,
        key: videoKey,
      }),
    });

    if (!response.ok) throw new Error("Failed to get upload URL");
    const { presignedUrl } = await response.json();

    const uploadResponse = await fetch(presignedUrl, {
      method: "PUT",
      body: blob,
    });

    if (!uploadResponse.ok) throw new Error(`Failed to upload part ${partNum}`);

    const ETag = uploadResponse.headers.get("ETag");
    if (!ETag) {
      throw new Error(`Missing ETag for part ${partNum}`);
    }

    uploadedParts.push({
      PartNumber: partNum,
      ETag: ETag.replace(/"/g, ""),
    });

    console.log(`Successfully uploaded part ${partNum}, ETag: ${ETag}`);
    return true;
  } catch (error) {
    console.error(`Error uploading part ${partNum}:`, error);
    throw error;
  }
}

// // Function to mix audio streams using Web Audio API
function mixAudioStreams(tabAudioStream, micAudioStream) {
  audioContext = new (window.AudioContext || window.webkitAudioContext)();

  // Create source nodes for each audio stream
  const tabSource = audioContext.createMediaStreamSource(tabAudioStream);
  const micSource = audioContext.createMediaStreamSource(micAudioStream);

  // Create a destination node
  const destination = audioContext.createMediaStreamDestination();

  // Connect sources to the destination
  tabSource.connect(destination);
  micSource.connect(destination);

  mixedAudioStream = destination.stream;

  return mixedAudioStream;
}

// Add this function at the top with your other functions
async function getMicrophonePermission() {
  if (!includeAudio) return null;

  try {
    // Request microphone access
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false,
    });

    // If successful, stop the temporary stream since we'll request it again during recording
    stream.getTracks().forEach((track) => track.stop());
    return true;
  } catch (error) {
    console.warn("Microphone permission denied:", error);
    return false;
  }
}

async function startRecording() {
  try {
    if (includeAudio) {
      const micPermission = await getMicrophonePermission();
      if (micPermission === false) {
        // User denied mic access, ask if they want to continue without mic
        if (
          !confirm(
            "Microphone access was denied. Continue recording without microphone?"
          )
        ) {
          throw new Error(
            "Recording cancelled due to microphone permission denial"
          );
        }
        // If they continue, disable audio recording
        includeAudio = false;
      }
    }

    const displayMediaOptions = {
      video: true,
      audio: includeAudio,
    };

    displayStream = await navigator.mediaDevices.getDisplayMedia(
      displayMediaOptions
    );

    displayStream
      .getVideoTracks()[0]
      .addEventListener("ended", handleStreamEnded);
    mediaStream = displayStream;

    if (
      displayStream.getVideoTracks()[0].label.toLowerCase().includes("screen")
    ) {
      window.addEventListener("beforeunload", function (e) {
        if (isRecording) {
          e.preventDefault();
          // Modern browsers standardized on showing a generic message
          // regardless of the string returned
          return "Recording in progress. Are you sure you want to leave?";
        }
      });
    }

    if (includeAudio) {
      try {
        // Capture microphone audio
        micStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });
        const hasSystemAudio = displayStream.getAudioTracks().length > 0;
        if (hasSystemAudio) {
          // Mix system/tab audio with microphone audio
          mixedAudioStream = mixAudioStreams(displayStream, micStream);
          console.log("Mixed system/tab audio with microphone audio.");
        } else {
          // If no system/tab audio, use only microphone audio
          mixedAudioStream = micStream;
          console.warn(
            "No system/tab audio tracks found. Recording only microphone audio."
          );
          // Optionally, notify the user without using alert
          // alert("System/tab audio is not captured. Please ensure 'Share audio' is enabled when sharing your screen.");
        }
        // Combine video with mixed audio
        mediaStream = new MediaStream([
          ...displayStream.getVideoTracks(),
          ...mixedAudioStream.getAudioTracks(),
        ]);
      } catch (audioError) {
        console.warn(
          "Audio access denied, continuing without audio:",
          audioError
        );
        alert(
          "Audio access denied. Recording will continue without microphone audio."
        );
      }
    }

    // Initialize upload
    const initResponse = await fetch("http://localhost:3500/init-multipart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: `recording-${Date.now()}.webm`,
      }),
    });

    if (!initResponse.ok) throw new Error("Failed to initialize upload");
    const { uploadId: newUploadId, key } = await initResponse.json();
    uploadId = newUploadId;
    videoKey = key;

    // Reset upload state
    currentChunks = [];
    currentChunkSize = 0;
    partNumber = 1;
    uploadedParts = [];

    recorder = new MediaRecorder(mediaStream, {
      mimeType: "video/webm;codecs=vp8,opus",
      videoBitsPerSecond: 2500000,
      audioBitsPerSecond: 128000,
    });

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        currentChunks.push(event.data);
        currentChunkSize += event.data.size;

        // Upload when we reach chunk size
        if (currentChunkSize >= CHUNK_SIZE) {
          const currentPartNumber = partNumber++;
          const chunksToUpload = [...currentChunks]; // Create a shallow copy
          currentChunks = [];
          currentChunkSize = 0;

          // Add the upload to the queue
          uploadQueue = uploadQueue
            .then(() => uploadChunk(chunksToUpload, currentPartNumber))
            .catch((error) => {
              console.error(
                `Failed to upload part ${currentPartNumber}:`,
                error
              );
              // Optionally, handle retries or abort recording
            });
        }
      }
    };

    recorder.onstop = async () => {
      try {
        // Upload any remaining chunks
        if (currentChunks.length > 0) {
          const finalPartNumber = partNumber++;
          const chunksToUpload = [...currentChunks];
          currentChunks = [];
          currentChunkSize = 0;

          // Add the final upload to the queue
          uploadQueue = uploadQueue
            .then(() => uploadChunk(chunksToUpload, finalPartNumber))
            .catch((error) => {
              console.error(`Failed to upload part ${finalPartNumber}:`, error);
              // Optionally, handle retries or abort recording
            });
        }

        // Wait for all uploads in the queue to complete
        await uploadQueue;

        // Complete the multipart upload
        const completeResponse = await fetch(
          "http://localhost:3500/complete-multipart",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              uploadId,
              key: videoKey,
              parts: uploadedParts.sort((a, b) => a.PartNumber - b.PartNumber),
            }),
          }
        );

        if (!completeResponse.ok) throw new Error("Failed to complete upload");
        console.log("Upload completed successfully");

        // Open video player
        chrome.runtime.sendMessage({
          action: "openVideoPlayer",
          url: chrome.runtime.getURL(
            `player.html?key=${encodeURIComponent(videoKey)}`
          ),
        });
      } catch (error) {
        console.error("Error uploading recording:", error);
      } finally {
        // Clear the recording state
        chrome.storage.local.set({ isRecording: false });
        // Clear the badge
        chrome.runtime.sendMessage({
          action: "updateBadge",
          text: "",
        });
        isRecording = false;
      }
    };

    // Start recording and create chunks every second
    recorder.start(1000);
    console.log("Recording started");

    // Set recording state to true
    chrome.storage.local.set({ isRecording: true });

    chrome.runtime.sendMessage({
      action: "updateBadge",
      text: "REC",
      color: "#FF0000",
    });

    isRecording = true;
  } catch (error) {
    console.error("Error starting recording:", error);
    chrome.runtime.sendMessage({ action: "stopRecording" });
    chrome.storage.local.set({ isRecording: false });
    throw error;
  }
}

function handleStreamEnded() {
  if (isRecording) {
    stopRecording();
    chrome.runtime.sendMessage({ action: "stopRecording" });
  }
}

async function stopRecording() {
  console.log("Stopping recording");

  if (recorder && recorder.state !== "inactive") {
    recorder.stop();
  }

  if (mediaStream) {
    mediaStream.getTracks().forEach((track) => {
      track.removeEventListener("ended", handleStreamEnded);
      track.stop();
    });
    mediaStream = null;
  }

  if (displayStream) {
    displayStream.getTracks().forEach((track) => {
      track.removeEventListener("ended", handleStreamEnded);
      track.stop();
    });
    displayStream = null;
  }

  if (micStream) {
    micStream.getTracks().forEach((track) => track.stop());
    micStream = null;
  }

  if (audioContext) {
    audioContext.close().catch((error) => {
      console.error("Error closing AudioContext:", error);
    });
    audioContext = null;
  }

  if (mixedAudioStream && mixedAudioStream !== micStream) {
    mixedAudioStream.getTracks().forEach((track) => track.stop());
    mixedAudioStream = null;
  }

  // Remove the beforeunload listener
  window.removeEventListener("beforeunload", function (e) {
    if (isRecording) {
      e.preventDefault();
      // e.returnValue =
      //   "Recording in progress. If you leave, your recording will be lost. Are you sure?";
      // return e.returnValue;
      return "Recording in progress. Are you sure you want to leave?";
    }
  });

  recorder = null;
  isRecording = false;

  // Clear the recording state in storage
  chrome.storage.local.set({ isRecording: false });

  chrome.runtime.sendMessage({ action: "stopRecording" });
  chrome.runtime.sendMessage({
    action: "updateBadge",
    text: "",
  });
}

// Message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "startRecording") {
    if (isRecording) {
      sendResponse({ success: false, error: "Already recording" });
      return true;
    }
    includeAudio = message.includeAudio;

    startRecording()
      .then(() => {
        sendResponse({ success: true });
      })
      .catch((error) => {
        console.error(error);
        sendResponse({ success: false, error: error.message });
      });

    return true;
  }

  if (message.action === "stopRecording") {
    if (isRecording) {
      stopRecording();
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false, error: "Not recording" });
    }
    return true;
  }

  return true;
});
