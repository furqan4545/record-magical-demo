////////////////////////////////////////////////////////////////

// let recorder = null;
// let data = [];
// let port = null;
// let mediaStream = null;
// let combinedStream = null;
// let displayStream = null;

// chrome.runtime.onConnect.addListener((connectionPort) => {
//   if (connectionPort.name === "offscreen") {
//     port = connectionPort;
//     port.onMessage.addListener(handleMessage);
//   }
// });

// async function handleMessage(message) {
//   console.log("[offscreen] message received:", message.type);

//   if (message.type === "start-screen-recording") {
//     await startRecording(message.data);
//   } else if (message.type === "stop-screen-recording") {
//     await stopRecording();
//   }
// }

// async function startRecording({ streamId, includeAudio }) {
//   try {
//     if (recorder?.state === "recording") {
//       console.log("Already recording, stopping previous recording");
//       await stopRecording();
//     }

//     console.log("Starting recording with streamId:", streamId);

//     // Get display stream using getDisplayMedia
//     displayStream = await navigator.mediaDevices.getDisplayMedia({
//       video: {
//         displaySurface: "monitor",
//         logicalSurface: true,
//         cursor: "always",
//       },
//       audio: false, // Do not include system audio
//     });

//     console.log("Display stream obtained:", displayStream);

//     // Listen for 'ended' event on the display stream
//     displayStream.getVideoTracks()[0].addEventListener("ended", () => {
//       console.log("Display stream ended by user");
//       // Automatically stop recording
//       stopRecording();
//     });

//     // Initialize combinedStream with displayStream
//     combinedStream = new MediaStream([...displayStream.getTracks()]);

//     if (includeAudio) {
//       // Get audio stream using getUserMedia
//       const audioStream = await navigator.mediaDevices.getUserMedia({
//         audio: {
//           echoCancellation: true,
//           noiseSuppression: true,
//           autoGainControl: true,
//         },
//         video: false,
//       });

//       console.log("Audio stream obtained:", audioStream);

//       // Add audio tracks to combinedStream
//       audioStream.getAudioTracks().forEach((track) => {
//         combinedStream.addTrack(track);
//       });
//     }

//     console.log("Combined stream:", combinedStream);

//     // Adjust the MIME type and options based on includeAudio
//     // Explicitly type 'options' as 'MediaRecorderOptions'
//     let options;

//     if (includeAudio) {
//       options = {
//         mimeType: "video/webm;codecs=vp8,opus",
//         videoBitsPerSecond: 2500000,
//         audioBitsPerSecond: 128000,
//       };
//     } else {
//       options = {
//         mimeType: "video/webm;codecs=vp8",
//         videoBitsPerSecond: 2500000,
//       };
//     }

//     // Create and start recorder
//     recorder = new MediaRecorder(combinedStream, options);

//     data = [];

//     recorder.ondataavailable = (event) => {
//       if (event.data && event.data.size > 0) {
//         console.log("Chunk size:", event.data.size);
//         data.push(event.data);
//       }
//     };

//     recorder.onerror = (event) => {
//       console.error("Recording error:", event.error);
//       // Send error message to background.js
//       chrome.runtime.sendMessage({
//         action: "recordingError",
//         error: event.error.message,
//       });
//     };

//     recorder.onstop = async () => {
//       try {
//         console.log("Recording stopped, processing data");
//         console.log("Number of chunks:", data.length);

//         if (!data.length) {
//           throw new Error("No recording data available");
//         }

//         const blob = new Blob(data, { type: "video/webm" });
//         console.log("Final blob size:", blob.size);

//         const reader = new FileReader();

//         reader.onload = () => {
//           const base64data = reader.result.split(",")[1];
//           chrome.runtime.sendMessage({
//             type: "download-recording",
//             data: base64data,
//             mimeType: "video/webm",
//           });
//         };

//         reader.onerror = (error) => {
//           console.error("Error reading blob:", error);
//         };

//         reader.readAsDataURL(blob);
//       } catch (error) {
//         console.error("Error processing recording:", error);
//         chrome.runtime.sendMessage({
//           action: "recordingError",
//           error: error.message,
//         });
//       }
//     };

//     // Start recording with 1-second chunks
//     recorder.start(1000);
//     console.log("Screen recording started successfully");
//     // Notify that screen sharing was allowed
//     chrome.runtime.sendMessage({ action: "screenShareAllowed" });
//   } catch (err) {
//     console.error("Error starting recording:", err);
//     if (err.name === "NotAllowedError") {
//       chrome.runtime.sendMessage({
//         action: "recordingCancelled",
//         reason: "Permission denied",
//       });
//     } else {
//       chrome.runtime.sendMessage({
//         action: "recordingCancelled",
//         reason: "Unknown error",
//       });
//     }
//   }
// }

// async function stopRecording() {
//   console.log("Stopping recording");
//   try {
//     if (recorder?.state === "recording") {
//       recorder.requestData();
//       recorder.stop();
//     }

//     if (mediaStream) {
//       mediaStream.getTracks().forEach((track) => {
//         console.log(`Stopping ${track.kind} track`);
//         track.stop();
//       });
//     }

//     if (displayStream) {
//       displayStream.getTracks().forEach((track) => {
//         console.log(`Stopping ${track.kind} track`);
//         track.stop();
//       });
//     }

//     if (combinedStream) {
//       combinedStream.getTracks().forEach((track) => {
//         console.log(`Stopping ${track.kind} track`);
//         track.stop();
//       });
//     }

//     mediaStream = null;
//     recorder = null;

//     displayStream = null;
//     combinedStream = null;

//     // Notify background script that recording has stopped
//     chrome.runtime.sendMessage({
//       action: "recordingStoppedByUser",
//     });
//   } catch (error) {
//     console.error("Error in stopRecording:", error);
//   }
// }

// // Cleanup on page unload
// window.addEventListener("beforeunload", () => {
//   stopRecording();
// });

//////////////////// This is for uploading to Azure Blob Storage /////////////////

let recorder = null;
let port = null;
let mediaStream = null;
let combinedStream = null;
let displayStream = null;

let uploadUrl = null;
let baseBlobUrl = null;
let sasToken = null;
let blockIds = []; // Array to store block IDs
let blockCount = 0; // Counter for block IDs
let blockUploadPromises = []; // Array to store block upload promises

chrome.runtime.onConnect.addListener((connectionPort) => {
  if (connectionPort.name === "offscreen") {
    port = connectionPort;
    port.onMessage.addListener(handleMessage);
  }
});

async function handleMessage(message) {
  console.log("[offscreen] message received:", message.type);

  if (message.type === "start-screen-recording") {
    await startRecording(message.data);
  } else if (message.type === "stop-screen-recording") {
    await stopRecording();
  }
}

async function getUploadUrl() {
  try {
    const response = await fetch("http://localhost:3500/get-sas-token"); // Your server endpoint
    if (!response.ok) {
      throw new Error("Failed to obtain SAS token");
    }
    const data = await response.json();
    console.log("Received upload URL:", data.uploadUrl); // Log the upload URL
    return data.uploadUrl;
  } catch (error) {
    console.error("Error obtaining upload URL:", error);
    throw error;
  }
}

async function startRecording({ streamId, includeAudio }) {
  try {
    if (recorder?.state === "recording") {
      console.log("Already recording, stopping previous recording");
      await stopRecording();
    }

    console.log("Starting recording with streamId:", streamId);

    // Get the upload URL
    uploadUrl = await getUploadUrl();

    // Parse the upload URL to extract the base blob URL and SAS token
    const [baseUrl, sas] = uploadUrl.split("?");
    baseBlobUrl = baseUrl;
    sasToken = sas;

    // Initialize blockIds array, blockCount, and blockUploadPromises
    blockIds = [];
    blockCount = 0;
    blockUploadPromises = [];

    // Get display stream using getDisplayMedia
    displayStream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        displaySurface: "monitor",
        logicalSurface: true,
        cursor: "always",
      },
      audio: false,
    });

    console.log("Display stream obtained:", displayStream);

    // Listen for 'ended' event on the display stream
    displayStream.getVideoTracks()[0].addEventListener("ended", () => {
      console.log("Display stream ended by user");
      // Automatically stop recording
      stopRecording();
    });

    // Initialize combinedStream with displayStream
    combinedStream = new MediaStream([...displayStream.getTracks()]);

    if (includeAudio) {
      // Get audio stream using getUserMedia
      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      console.log("Audio stream obtained:", audioStream);

      // Add audio tracks to combinedStream
      audioStream.getAudioTracks().forEach((track) => {
        combinedStream.addTrack(track);
      });
    }

    console.log("Combined stream:", combinedStream);

    // Adjust the MIME type and options based on includeAudio
    let options;

    if (includeAudio) {
      options = {
        mimeType: "video/webm;codecs=vp8,opus",
        videoBitsPerSecond: 2500000,
        audioBitsPerSecond: 128000,
      };
    } else {
      options = {
        mimeType: "video/webm;codecs=vp8",
        videoBitsPerSecond: 2500000,
      };
    }

    // Create and start recorder
    recorder = new MediaRecorder(combinedStream, options);

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
      // Send error message to background.js
      chrome.runtime.sendMessage({
        action: "recordingError",
        error: event.error.message,
      });
    };

    recorder.onstop = async () => {
      try {
        console.log("Recording stopped");

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
          downloadUrl: `${baseBlobUrl}?${sasToken}`, // Include SAS token with 'r' permission
        });
      } catch (error) {
        console.error("Error finalizing recording:", error);
        chrome.runtime.sendMessage({
          action: "recordingError",
          error: error.message,
        });
      }
    };

    // Start recording with 1-second chunks
    recorder.start(1000);
    console.log("Screen recording started successfully");
    // Notify that screen sharing was allowed
    chrome.runtime.sendMessage({ action: "screenShareAllowed" });
  } catch (err) {
    console.error("Error starting recording:", err);
    if (err.name === "NotAllowedError") {
      chrome.runtime.sendMessage({
        action: "recordingCancelled",
        reason: "Permission denied",
      });
    } else {
      chrome.runtime.sendMessage({
        action: "recordingCancelled",
        reason: err.message || "Unknown error",
      });
    }
  }
}

async function stopRecording() {
  console.log("Stopping recording");
  try {
    if (recorder?.state === "recording") {
      recorder.requestData();
      recorder.stop();
    }

    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => {
        console.log(`Stopping ${track.kind} track`);
        track.stop();
      });
    }

    if (displayStream) {
      displayStream.getTracks().forEach((track) => {
        console.log(`Stopping ${track.kind} track`);
        track.stop();
      });
    }

    if (combinedStream) {
      combinedStream.getTracks().forEach((track) => {
        console.log(`Stopping ${track.kind} track`);
        track.stop();
      });
    }

    mediaStream = null;
    recorder = null;

    displayStream = null;
    combinedStream = null;

    // blockIds will be processed in recorder.onstop
  } catch (error) {
    console.error("Error in stopRecording:", error);
  }
}

// Cleanup on page unload
window.addEventListener("beforeunload", () => {
  stopRecording();
});
