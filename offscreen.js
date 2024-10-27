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

//     // Create and start recorder
//     recorder = new MediaRecorder(combinedStream, {
//       mimeType: "video/webm;codecs=vp8,opus",
//       videoBitsPerSecond: 2500000,
//       audioBitsPerSecond: includeAudio ? 128000 : 0,
//     });

//     data = [];

//     recorder.ondataavailable = (event) => {
//       if (event.data && event.data.size > 0) {
//         console.log("Chunk size:", event.data.size);
//         data.push(event.data);
//       }
//     };

//     recorder.onerror = (event) => {
//       console.error("Recording error:", event.error);
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
//   } catch (error) {
//     console.error("Error in stopRecording:", error);
//   }
// }

// // Cleanup on page unload
// window.addEventListener("beforeunload", () => {
//   stopRecording();
// });

///////////// test ///////////////

let recorder = null;
let data = [];
let port = null;
let mediaStream = null;
let combinedStream = null;
let displayStream = null;

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

async function startRecording({ streamId, includeAudio }) {
  try {
    if (recorder?.state === "recording") {
      console.log("Already recording, stopping previous recording");
      await stopRecording();
    }

    console.log("Starting recording with streamId:", streamId);

    // Get display stream using getDisplayMedia
    displayStream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        displaySurface: "monitor",
        logicalSurface: true,
        cursor: "always",
      },
      audio: false, // Do not include system audio
    });

    console.log("Display stream obtained:", displayStream);

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

    // Create and start recorder
    recorder = new MediaRecorder(combinedStream, {
      mimeType: "video/webm;codecs=vp8,opus",
      videoBitsPerSecond: 2500000,
      audioBitsPerSecond: includeAudio ? 128000 : 0,
    });

    data = [];

    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        console.log("Chunk size:", event.data.size);
        data.push(event.data);
      }
    };

    recorder.onerror = (event) => {
      console.error("Recording error:", event.error);
    };

    recorder.onstop = async () => {
      try {
        console.log("Recording stopped, processing data");
        console.log("Number of chunks:", data.length);

        if (!data.length) {
          throw new Error("No recording data available");
        }

        const blob = new Blob(data, { type: "video/webm" });
        console.log("Final blob size:", blob.size);

        const reader = new FileReader();

        reader.onload = () => {
          const base64data = reader.result.split(",")[1];
          chrome.runtime.sendMessage({
            type: "download-recording",
            data: base64data,
            mimeType: "video/webm",
          });
        };

        reader.onerror = (error) => {
          console.error("Error reading blob:", error);
        };

        reader.readAsDataURL(blob);
      } catch (error) {
        console.error("Error processing recording:", error);
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
        reason: "Unknown error",
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
  } catch (error) {
    console.error("Error in stopRecording:", error);
  }
}

// Cleanup on page unload
window.addEventListener("beforeunload", () => {
  stopRecording();
});
