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

//       // Update recording state
//       isRecording = true;

//       // Notify background script that recording has started
//       chrome.runtime.sendMessage({
//         action: "startRecording",
//         recordingTabId: message.recordingTabId,
//       });

//       // Update badge text
//       chrome.runtime.sendMessage({
//         action: "updateBadge",
//         text: "REC",
//       });
//     } catch (error) {
//       console.error("Error starting recording:", error);

//       // Notify background script to reset recording state
//       chrome.runtime.sendMessage({ action: "stopRecording" });

//       // Update badge text
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
//     // Request display media immediately
//     const displayMediaOptions = {
//       video: true,
//       audio: includeAudio,
//     };

//     const displayStream = await navigator.mediaDevices.getDisplayMedia(
//       displayMediaOptions
//     );

//     // Handle when the user stops sharing the screen
//     displayStream.getVideoTracks()[0].addEventListener("ended", () => {
//       stopRecording();
//     });

//     // If includeAudio is true, check if system audio is available
//     if (includeAudio) {
//       const audioTracks = displayStream.getAudioTracks();
//       if (audioTracks && audioTracks.length > 0) {
//         // System audio is available
//         mediaStream = displayStream;
//       } else {
//         // System audio is not available, capture microphone audio
//         const audioStream = await navigator.mediaDevices.getUserMedia({
//           audio: true,
//           video: false,
//         });

//         // Combine display stream and microphone audio stream
//         const combinedStream = new MediaStream([
//           ...displayStream.getVideoTracks(),
//           ...audioStream.getAudioTracks(),
//         ]);

//         mediaStream = combinedStream;
//       }
//     } else {
//       // Audio not included
//       mediaStream = displayStream;
//     }

//     // Now, get the upload URL
//     uploadUrl = await getUploadUrl();

//     // Parse the upload URL to extract the base blob URL and SAS token
//     const [baseUrl, sas] = uploadUrl.split("?");
//     baseBlobUrl = baseUrl;
//     sasToken = sas;

//     // Initialize blockIds array, blockCount, and blockUploadPromises
//     blockIds = [];
//     blockCount = 0;
//     blockUploadPromises = [];

//     const options = {
//       mimeType: "video/webm; codecs=vp8,opus",
//       videoBitsPerSecond: 2500000,
//       audioBitsPerSecond: 128000,
//     };

//     recorder = new MediaRecorder(mediaStream, options);

//     recorder.ondataavailable = (event) => {
//       if (event.data && event.data.size > 0) {
//         blockCount++;
//         const blockIdString = "block-" + String(blockCount).padStart(6, "0");
//         const blockId = btoa(blockIdString);
//         blockIds.push(blockId);

//         const blockUrl = `${baseBlobUrl}?comp=block&blockid=${encodeURIComponent(
//           blockId
//         )}&${sasToken}`;

//         // Start the upload and store the promise
//         const uploadPromise = fetch(blockUrl, {
//           method: "PUT",
//           body: event.data,
//           headers: {
//             "Content-Type": "application/octet-stream",
//           },
//         })
//           .then(async (uploadResponse) => {
//             if (!uploadResponse.ok) {
//               const errorText = await uploadResponse.text();
//               console.error("Block upload error:", errorText);
//               throw new Error("Block upload failed");
//             } else {
//               console.log(
//                 `Uploaded block ${blockIdString}, size: ${event.data.size}`
//               );
//             }
//           })
//           .catch(async (error) => {
//             console.error("Error uploading block:", error);
//             // Handle errors, possibly stop recording
//             await stopRecording();
//           });

//         // Add the upload promise to the array
//         blockUploadPromises.push(uploadPromise);
//       }
//     };

//     recorder.onerror = (event) => {
//       console.error("Recording error:", event.error);
//       // Handle error, possibly stop recording
//       stopRecording();
//     };

//     recorder.onstop = async () => {
//       try {
//         // Wait for all block uploads to complete
//         await Promise.all(blockUploadPromises);

//         // Commit the block list
//         const blockListXml =
//           '<?xml version="1.0" encoding="utf-8"?><BlockList>' +
//           blockIds.map((id) => `<Latest>${id}</Latest>`).join("") +
//           "</BlockList>";

//         const blockListUrl = `${baseBlobUrl}?comp=blocklist&${sasToken}`;

//         const commitResponse = await fetch(blockListUrl, {
//           method: "PUT",
//           body: blockListXml,
//           headers: {
//             "Content-Type": "application/xml",
//           },
//         });

//         if (!commitResponse.ok) {
//           const errorText = await commitResponse.text();
//           console.error("Block list commit error:", errorText);
//           throw new Error("Failed to commit block list");
//         }

//         console.log("Block list committed successfully");

//         // Notify background script that recording has stopped
//         chrome.runtime.sendMessage({
//           action: "recordingStopped",
//           downloadUrl: `${baseBlobUrl}?${sasToken}`,
//         });

//         // Update badge text
//         chrome.runtime.sendMessage({
//           action: "updateBadge",
//           text: "",
//         });

//         // Reset recording state
//         isRecording = false;
//       } catch (error) {
//         console.error("Error finalizing recording:", error);
//         // Handle error
//         isRecording = false;
//       }
//     };

//     // Start recording with 1-second chunks
//     recorder.start(1000);
//     console.log("Screen recording started successfully");
//   } catch (error) {
//     console.error("Error during startRecording:", error);

//     // Notify background script to reset recording state
//     chrome.runtime.sendMessage({ action: "stopRecording" });

//     throw error; // Rethrow the error to be handled in the caller
//   }
// }

// async function stopRecording() {
//   console.log("Stopping recording");
//   if (recorder && recorder.state !== "inactive") {
//     recorder.stop();
//   }

//   if (mediaStream) {
//     mediaStream.getTracks().forEach((track) => track.stop());
//     mediaStream = null;
//   }

//   recorder = null;
//   isRecording = false;

//   // Notify background script that recording has stopped
//   chrome.runtime.sendMessage({ action: "stopRecording" });

//   // Update badge text
//   chrome.runtime.sendMessage({
//     action: "updateBadge",
//     text: "",
//   });
// }

// // Function to get the upload URL
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
//////////////// Working v2 ////////////////////////////////////
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

//       // Update recording state
//       isRecording = true;

//       // Notify background script that recording has started
//       chrome.runtime.sendMessage({
//         action: "startRecording",
//         recordingTabId: message.recordingTabId,
//       });

//       // Update badge text
//       chrome.runtime.sendMessage({
//         action: "updateBadge",
//         text: "REC",
//       });
//     } catch (error) {
//       console.error("Error starting recording:", error);

//       // Notify background script to reset recording state
//       chrome.runtime.sendMessage({ action: "stopRecording" });

//       // Update badge text
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
//     // Request display media immediately
//     const displayMediaOptions = {
//       video: true,
//       audio: includeAudio,
//     };

//     const displayStream = await navigator.mediaDevices.getDisplayMedia(
//       displayMediaOptions
//     );

//     // Handle when the user stops sharing the screen
//     displayStream.getVideoTracks()[0].addEventListener("ended", () => {
//       stopRecording();
//     });

//     // If includeAudio is true, check if system audio is available
//     if (includeAudio) {
//       const audioTracks = displayStream.getAudioTracks();
//       if (audioTracks && audioTracks.length > 0) {
//         // System audio is available
//         mediaStream = displayStream;
//       } else {
//         // System audio is not available, capture microphone audio
//         const audioStream = await navigator.mediaDevices.getUserMedia({
//           audio: true,
//           video: false,
//         });

//         // Combine display stream and microphone audio stream
//         const combinedStream = new MediaStream([
//           ...displayStream.getVideoTracks(),
//           ...audioStream.getAudioTracks(),
//         ]);

//         mediaStream = combinedStream;
//       }
//     } else {
//       // Audio not included
//       mediaStream = displayStream;
//     }

//     // Now, get the upload URL
//     uploadUrl = await getUploadUrl();

//     // Parse the upload URL to extract the base blob URL and SAS token
//     const [baseUrl, sas] = uploadUrl.split("?");
//     baseBlobUrl = baseUrl;
//     sasToken = sas;

//     // Initialize blockIds array, blockCount, and blockUploadPromises
//     blockIds = [];
//     blockCount = 0;
//     blockUploadPromises = [];

//     const options = {
//       mimeType: "video/webm; codecs=vp8,opus",
//       videoBitsPerSecond: 2500000,
//       audioBitsPerSecond: 128000,
//     };

//     recorder = new MediaRecorder(mediaStream, options);

//     recorder.ondataavailable = (event) => {
//       if (event.data && event.data.size > 0) {
//         blockCount++;
//         const blockIdString = "block-" + String(blockCount).padStart(6, "0");
//         const blockId = btoa(blockIdString);
//         blockIds.push(blockId);

//         const blockUrl = `${baseBlobUrl}?comp=block&blockid=${encodeURIComponent(
//           blockId
//         )}&${sasToken}`;

//         // Start the upload and store the promise
//         const uploadPromise = fetch(blockUrl, {
//           method: "PUT",
//           body: event.data,
//           headers: {
//             "Content-Type": "application/octet-stream",
//           },
//         })
//           .then(async (uploadResponse) => {
//             if (!uploadResponse.ok) {
//               const errorText = await uploadResponse.text();
//               console.error("Block upload error:", errorText);
//               throw new Error("Block upload failed");
//             } else {
//               console.log(
//                 `Uploaded block ${blockIdString}, size: ${event.data.size}`
//               );
//             }
//           })
//           .catch(async (error) => {
//             console.error("Error uploading block:", error);
//             // Handle errors, possibly stop recording
//             await stopRecording();
//           });

//         // Add the upload promise to the array
//         blockUploadPromises.push(uploadPromise);
//       }
//     };

//     recorder.onerror = (event) => {
//       console.error("Recording error:", event.error);
//       // Handle error, possibly stop recording
//       stopRecording();
//     };

//     recorder.onstop = async () => {
//       try {
//         // Wait for all block uploads to complete
//         await Promise.all(blockUploadPromises);

//         // Commit the block list
//         const blockListXml =
//           '<?xml version="1.0" encoding="utf-8"?><BlockList>' +
//           blockIds.map((id) => `<Latest>${id}</Latest>`).join("") +
//           "</BlockList>";

//         const blockListUrl = `${baseBlobUrl}?comp=blocklist&${sasToken}`;

//         const commitResponse = await fetch(blockListUrl, {
//           method: "PUT",
//           body: blockListXml,
//           headers: {
//             "Content-Type": "application/xml",
//           },
//         });

//         if (!commitResponse.ok) {
//           const errorText = await commitResponse.text();
//           console.error("Block list commit error:", errorText);
//           throw new Error("Failed to commit block list");
//         }

//         console.log("Block list committed successfully");

//         // Notify background script that recording has stopped
//         chrome.runtime.sendMessage({
//           action: "recordingStopped",
//           downloadUrl: `${baseBlobUrl}?${sasToken}`,
//         });

//         // Update badge text
//         chrome.runtime.sendMessage({
//           action: "updateBadge",
//           text: "",
//         });

//         // Reset recording state
//         isRecording = false;
//       } catch (error) {
//         console.error("Error finalizing recording:", error);
//         // Handle error
//         isRecording = false;
//       }
//     };

//     // Start recording with 1-second chunks
//     recorder.start(1000);
//     console.log("Screen recording started successfully");
//   } catch (error) {
//     console.error("Error during startRecording:", error);

//     // Notify background script to reset recording state
//     chrome.runtime.sendMessage({ action: "stopRecording" });

//     throw error; // Rethrow the error to be handled in the caller
//   }
// }

// async function stopRecording() {
//   console.log("Stopping recording");
//   if (recorder && recorder.state !== "inactive") {
//     recorder.stop();
//   }

//   if (mediaStream) {
//     mediaStream.getTracks().forEach((track) => track.stop());
//     mediaStream = null;
//   }

//   recorder = null;
//   isRecording = false;

//   // Notify background script that recording has stopped
//   chrome.runtime.sendMessage({ action: "stopRecording" });

//   // Update badge text
//   chrome.runtime.sendMessage({
//     action: "updateBadge",
//     text: "",
//   });
// }

// // Function to get the upload URL
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
/// test

let recorder = null;
let isRecording = false;
let mediaStream = null;
let includeAudio = true;

let uploadUrl = null;
let baseBlobUrl = null;
let sasToken = null;
let blockIds = [];
let blockCount = 0;
let blockUploadPromises = [];

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.action === "startRecording") {
    if (isRecording) {
      sendResponse({ success: false, error: "Already recording." });
      return;
    }
    includeAudio = message.includeAudio;

    try {
      await startRecording();
      sendResponse({ success: true });

      // Update recording state
      isRecording = true;

      // Notify background script that recording has started
      chrome.runtime.sendMessage({
        action: "startRecording",
        recordingTabId: message.recordingTabId,
      });

      // Update badge text
      chrome.runtime.sendMessage({
        action: "updateBadge",
        text: "REC",
      });
    } catch (error) {
      console.error("Error starting recording:", error);

      // Notify background script to reset recording state
      chrome.runtime.sendMessage({ action: "stopRecording" });

      // Update badge text
      chrome.runtime.sendMessage({
        action: "updateBadge",
        text: "",
      });

      sendResponse({ success: false, error: error.message });
    }
    return true;
  }

  if (message.action === "stopRecording") {
    if (isRecording) {
      await stopRecording();
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false, error: "Not recording." });
    }
    return true;
  }
});

async function startRecording() {
  try {
    // Request display media immediately
    const displayMediaOptions = {
      video: true,
      audio: includeAudio,
    };

    const displayStream = await navigator.mediaDevices.getDisplayMedia(
      displayMediaOptions
    );

    // Handle when the user stops sharing the screen
    displayStream.getVideoTracks()[0].addEventListener("ended", () => {
      stopRecording();
    });

    // If includeAudio is true, check if system audio is available
    if (includeAudio) {
      const audioTracks = displayStream.getAudioTracks();
      if (audioTracks && audioTracks.length > 0) {
        //////////////////////////////////////////////////////////////
        const audioStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });

        // Combine display stream and microphone audio stream
        const combinedStream = new MediaStream([
          ...displayStream.getVideoTracks(),
          ...audioStream.getAudioTracks(),
        ]);

        mediaStream = combinedStream;
        //////////////////////////////////////////////////////////////

        // System audio is available
        // mediaStream = displayStream;
      } else {
        // System audio is not available, capture microphone audio
        const audioStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });

        // Combine display stream and microphone audio stream
        const combinedStream = new MediaStream([
          ...displayStream.getVideoTracks(),
          ...audioStream.getAudioTracks(),
        ]);

        mediaStream = combinedStream;
      }
    } else {
      // Audio not included
      mediaStream = displayStream;
    }

    // Now, get the upload URL
    uploadUrl = await getUploadUrl();

    // Parse the upload URL to extract the base blob URL and SAS token
    const [baseUrl, sas] = uploadUrl.split("?");
    baseBlobUrl = baseUrl;
    sasToken = sas;

    // Initialize blockIds array, blockCount, and blockUploadPromises
    blockIds = [];
    blockCount = 0;
    blockUploadPromises = [];

    const options = {
      mimeType: "video/webm; codecs=vp8,opus",
      videoBitsPerSecond: 2500000,
      audioBitsPerSecond: 128000,
    };

    recorder = new MediaRecorder(mediaStream, options);

    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        blockCount++;
        const blockIdString = "block-" + String(blockCount).padStart(6, "0");
        const blockId = btoa(blockIdString);
        blockIds.push(blockId);

        const blockUrl = `${baseBlobUrl}?comp=block&blockid=${encodeURIComponent(
          blockId
        )}&${sasToken}`;

        // Start the upload and store the promise
        const uploadPromise = fetch(blockUrl, {
          method: "PUT",
          body: event.data,
          headers: {
            "Content-Type": "application/octet-stream",
          },
        })
          .then(async (uploadResponse) => {
            if (!uploadResponse.ok) {
              const errorText = await uploadResponse.text();
              console.error("Block upload error:", errorText);
              throw new Error("Block upload failed");
            } else {
              console.log(
                `Uploaded block ${blockIdString}, size: ${event.data.size}`
              );
            }
          })
          .catch(async (error) => {
            console.error("Error uploading block:", error);
            // Handle errors, possibly stop recording
            await stopRecording();
          });

        // Add the upload promise to the array
        blockUploadPromises.push(uploadPromise);
      }
    };

    recorder.onerror = (event) => {
      console.error("Recording error:", event.error);
      // Handle error, possibly stop recording
      stopRecording();
    };

    recorder.onstop = async () => {
      try {
        // Wait for all block uploads to complete
        await Promise.all(blockUploadPromises);

        // Commit the block list
        const blockListXml =
          '<?xml version="1.0" encoding="utf-8"?><BlockList>' +
          blockIds.map((id) => `<Latest>${id}</Latest>`).join("") +
          "</BlockList>";

        const blockListUrl = `${baseBlobUrl}?comp=blocklist&${sasToken}`;

        const commitResponse = await fetch(blockListUrl, {
          method: "PUT",
          body: blockListXml,
          headers: {
            "Content-Type": "application/xml",
          },
        });

        if (!commitResponse.ok) {
          const errorText = await commitResponse.text();
          console.error("Block list commit error:", errorText);
          throw new Error("Failed to commit block list");
        }

        console.log("Block list committed successfully");

        // Notify background script that recording has stopped
        chrome.runtime.sendMessage({
          action: "recordingStopped",
          downloadUrl: `${baseBlobUrl}?${sasToken}`,
        });

        // Update badge text
        chrome.runtime.sendMessage({
          action: "updateBadge",
          text: "",
        });

        // Reset recording state
        isRecording = false;
      } catch (error) {
        console.error("Error finalizing recording:", error);
        // Handle error
        isRecording = false;
      }
    };

    // Start recording with 1-second chunks
    recorder.start(1000);
    console.log("Screen recording started successfully");
  } catch (error) {
    console.error("Error during startRecording:", error);

    // Notify background script to reset recording state
    chrome.runtime.sendMessage({ action: "stopRecording" });

    throw error; // Rethrow the error to be handled in the caller
  }
}

async function stopRecording() {
  console.log("Stopping recording");
  if (recorder && recorder.state !== "inactive") {
    recorder.stop();
  }

  if (mediaStream) {
    mediaStream.getTracks().forEach((track) => track.stop());
    mediaStream = null;
  }

  recorder = null;
  isRecording = false;

  // Notify background script that recording has stopped
  chrome.runtime.sendMessage({ action: "stopRecording" });

  // Update badge text
  chrome.runtime.sendMessage({
    action: "updateBadge",
    text: "",
  });
}

// Function to get the upload URL
async function getUploadUrl() {
  try {
    const response = await fetch("http://localhost:3500/get-sas-token");
    if (!response.ok) {
      throw new Error("Failed to obtain SAS token");
    }
    const data = await response.json();
    console.log("Received upload URL:", data.uploadUrl);
    return data.uploadUrl;
  } catch (error) {
    console.error("Error obtaining upload URL:", error);
    throw error;
  }
}
