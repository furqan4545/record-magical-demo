// // background.js

// let isRecording = false;
// let recordingTabId = null;

// chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
//   if (message.action === "updateBadge") {
//     chrome.action.setBadgeText({ text: message.text });
//     chrome.action.setBadgeBackgroundColor({
//       color: message.color || "#FF0000",
//     });
//     sendResponse({ success: true });
//   }

//   if (message.action === "startRecording") {
//     isRecording = true;
//     recordingTabId = message.recordingTabId; // Store the recording tab ID
//     sendResponse({ success: true });
//     return true;
//   }

//   if (message.action === "stopRecording") {
//     isRecording = false;
//     recordingTabId = null; // Clear the recording tab ID
//     sendResponse({ success: true });
//     return true;
//   }

//   if (message.action === "getRecordingState") {
//     sendResponse({ isRecording, recordingTabId });
//     return true;
//   }

//   if (message.action === "recordingStopped") {
//     isRecording = false;
//     recordingTabId = null;
//     console.log("Recording has been stopped and download initiated.");

//     const downloadUrl = message.downloadUrl;
//     console.log("Download URL:", downloadUrl);

//     // Initiate the download
//     chrome.downloads.download(
//       {
//         url: downloadUrl,
//         filename: `screen-recording_${Date.now()}.webm`,
//         saveAs: true,
//       },
//       (downloadId) => {
//         if (chrome.runtime.lastError) {
//           console.error("Download failed:", chrome.runtime.lastError);
//         } else {
//           console.log("Download started with ID:", downloadId);
//         }
//       }
//     );

//     sendResponse({ success: true });
//     return true;
//   }

//   return true;
// });

// background.js

let isRecording = false;
let recordingTabId = null;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "updateBadge") {
    chrome.action.setBadgeText({ text: message.text });
    chrome.action.setBadgeBackgroundColor({
      color: message.color || "#FF0000",
    });
    sendResponse({ success: true });
  }

  if (message.action === "startRecording") {
    isRecording = true;
    recordingTabId = message.recordingTabId; // Store the recording tab ID
    sendResponse({ success: true });
    return true;
  }

  if (message.action === "stopRecording") {
    isRecording = false;
    recordingTabId = null; // Clear the recording tab ID
    sendResponse({ success: true });
    return true;
  }

  if (message.action === "getRecordingState") {
    sendResponse({ isRecording, recordingTabId });
    return true;
  }

  if (message.action === "recordingStopped") {
    isRecording = false;
    recordingTabId = null;
    console.log("Recording has been stopped and download initiated.");

    const downloadUrl = message.downloadUrl;
    console.log("Download URL:", downloadUrl);

    // Initiate the download
    chrome.downloads.download(
      {
        url: downloadUrl,
        filename: `screen-recording_${Date.now()}.webm`,
        saveAs: true,
      },
      (downloadId) => {
        if (chrome.runtime.lastError) {
          console.error("Download failed:", chrome.runtime.lastError);
        } else {
          console.log("Download started with ID:", downloadId);
        }
      }
    );

    sendResponse({ success: true });
    return true;
  }

  return true;
});
