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
/// test 3
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
let displayStream = null; // Added to track display stream separately
let audioStream = null; // Added to track audio stream separately

function handleStreamEnded() {
  if (isRecording) {
    stopRecording();
    chrome.runtime.sendMessage({ action: "stopRecording" });
  }
}

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

      isRecording = true;
      chrome.runtime.sendMessage({
        action: "startRecording",
        recordingTabId: message.recordingTabId,
      });

      chrome.runtime.sendMessage({
        action: "updateBadge",
        text: "REC",
      });
    } catch (error) {
      console.error("Error starting recording:", error);
      chrome.runtime.sendMessage({ action: "stopRecording" });
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

    if (includeAudio) {
      const hasSystemAudio = displayStream.getAudioTracks().length > 0;

      // Always get microphone audio
      audioStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });

      const tracks = [
        ...displayStream.getVideoTracks(),
        ...audioStream.getAudioTracks(),
      ];

      if (hasSystemAudio) {
        tracks.push(...displayStream.getAudioTracks());
      }

      mediaStream = new MediaStream(tracks);
    } else {
      mediaStream = displayStream;
    }

    uploadUrl = await getUploadUrl();
    const [baseUrl, sas] = uploadUrl.split("?");
    baseBlobUrl = baseUrl;
    sasToken = sas;

    blockIds = [];
    blockCount = 0;
    blockUploadPromises = [];

    const options = {
      mimeType: "video/webm; codecs=vp8,opus",
      videoBitsPerSecond: 2500000,
      audioBitsPerSecond: 128000,
    };

    recorder = new MediaRecorder(mediaStream, options);

    recorder.ondataavailable = handleDataAvailable;
    recorder.onerror = handleRecordingError;
    recorder.onstop = handleRecordingStopped;

    recorder.start(1000);
    console.log("Screen recording started successfully");
  } catch (error) {
    console.error("Error during startRecording:", error);
    chrome.runtime.sendMessage({ action: "stopRecording" });
    throw error;
  }
}

async function handleDataAvailable(event) {
  if (event.data && event.data.size > 0) {
    blockCount++;
    const blockIdString = "block-" + String(blockCount).padStart(6, "0");
    const blockId = btoa(blockIdString);
    blockIds.push(blockId);

    const blockUrl = `${baseBlobUrl}?comp=block&blockid=${encodeURIComponent(
      blockId
    )}&${sasToken}`;

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
        await stopRecording();
      });

    blockUploadPromises.push(uploadPromise);
  }
}

function handleRecordingError(event) {
  console.error("Recording error:", event.error);
  stopRecording();
}

async function handleRecordingStopped() {
  try {
    await Promise.all(blockUploadPromises);

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

    chrome.runtime.sendMessage({
      action: "recordingStopped",
      downloadUrl: `${baseBlobUrl}?${sasToken}`,
    });

    chrome.runtime.sendMessage({
      action: "updateBadge",
      text: "",
    });

    isRecording = false;
  } catch (error) {
    console.error("Error finalizing recording:", error);
    isRecording = false;
  }
}

async function stopRecording() {
  console.log("Stopping recording");

  // Stop MediaRecorder
  if (recorder && recorder.state !== "inactive") {
    recorder.stop();
  }

  // Stop all tracks in the combined mediaStream
  if (mediaStream) {
    mediaStream.getTracks().forEach((track) => {
      track.removeEventListener("ended", handleStreamEnded);
      track.stop();
    });
    mediaStream = null;
  }

  // Stop display stream tracks
  if (displayStream) {
    displayStream.getTracks().forEach((track) => {
      track.removeEventListener("ended", handleStreamEnded);
      track.stop();
    });
    displayStream = null;
  }

  // Stop audio stream tracks
  if (audioStream) {
    audioStream.getTracks().forEach((track) => track.stop());
    audioStream = null;
  }

  recorder = null;
  isRecording = false;

  chrome.runtime.sendMessage({ action: "stopRecording" });
  chrome.runtime.sendMessage({
    action: "updateBadge",
    text: "",
  });
}

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
