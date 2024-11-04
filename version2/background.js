// // background.js

/////////////////////////////////////////////////////////////
///// WORKING LATEST CODE /////////

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

////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////
// TEST aws working v1

// let isRecording = false;
// let recordingTabId = null;

// // Listen for storage changes
// chrome.storage.local.onChanged.addListener((changes) => {
//   if (changes.isRecording) {
//     isRecording = changes.isRecording.newValue;
//   }
//   if (changes.recordingTabId) {
//     recordingTabId = changes.recordingTabId.newValue;
//   }
// });

// // Initialize state from storage
// chrome.storage.local.get(["isRecording", "recordingTabId"], (data) => {
//   isRecording = data.isRecording || false;
//   recordingTabId = data.recordingTabId || null;
// });

// chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
//   if (message.action === "updateBadge") {
//     chrome.action.setBadgeText({
//       text: message.text,
//     });
//     if (message.color) {
//       chrome.action.setBadgeBackgroundColor({
//         color: message.color,
//       });
//     }
//     // Update internal state to match badge
//     isRecording = message.text === "REC";
//     sendResponse({ success: true });
//   }

//   if (message.action === "startRecording") {
//     isRecording = true;
//     recordingTabId = message.recordingTabId;
//     // Also update storage
//     chrome.storage.local.set({
//       isRecording: true,
//       recordingTabId: message.recordingTabId,
//     });
//     sendResponse({ success: true });
//     return true;
//   }

//   if (message.action === "stopRecording") {
//     isRecording = false;
//     recordingTabId = null;
//     // Also update storage
//     chrome.storage.local.set({
//       isRecording: false,
//       recordingTabId: null,
//     });
//     sendResponse({ success: true });
//     return true;
//   }

//   if (message.action === "getActiveTab") {
//     chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
//       sendResponse(tabs[0]);
//     });
//     return true;
//   }

//   if (message.action === "openVideoPlayer") {
//     chrome.tabs
//       .create({
//         url: message.url,
//       })
//       .then(() => {
//         console.log("Video player opened");
//         sendResponse({ success: true });
//       })
//       .catch((error) => {
//         console.error("Error opening video player:", error);
//         sendResponse({ success: false, error: error.message });
//       });
//     return true;
//   }

//   if (message.action === "getRecordingState") {
//     // Return both recording state and tabId
//     chrome.storage.local.get(["isRecording", "recordingTabId"], (data) => {
//       sendResponse({
//         isRecording: data.isRecording || false,
//         recordingTabId: data.recordingTabId || null,
//       });
//     });
//     return true;
//   }

//   return true;
// });

// // Clean up stream when tab closes
// chrome.tabs.onRemoved.addListener((tabId) => {
//   if (activeStream) {
//     activeStream.getTracks().forEach((track) => track.stop());
//     activeStream = null;
//   }
// });

/// working code with one tab share issue resolved.

// let isRecording = false;
// let recordingTabId = null;

// // Listen for storage changes
// chrome.storage.local.onChanged.addListener((changes) => {
//   if (changes.isRecording) {
//     isRecording = changes.isRecording.newValue;
//   }
//   if (changes.recordingTabId) {
//     recordingTabId = changes.recordingTabId.newValue;
//   }
// });

// // Initialize state from storage
// chrome.storage.local.get(["isRecording", "recordingTabId"], (data) => {
//   isRecording = data.isRecording || false;
//   recordingTabId = data.recordingTabId || null;
// });

// chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
//   if (message.action === "updateBadge") {
//     chrome.action.setBadgeText({
//       text: message.text,
//     });
//     if (message.color) {
//       chrome.action.setBadgeBackgroundColor({
//         color: message.color,
//       });
//     }
//     // Update internal state to match badge
//     isRecording = message.text === "REC";
//     sendResponse({ success: true });
//   }

//   if (message.action === "startRecording") {
//     isRecording = true;
//     recordingTabId = message.recordingTabId;
//     // Also update storage
//     chrome.storage.local.set({
//       isRecording: true,
//       recordingTabId: message.recordingTabId,
//     });
//     sendResponse({ success: true });
//     return true;
//   }

//   if (message.action === "stopRecording") {
//     isRecording = false;
//     recordingTabId = null;
//     // Also update storage
//     chrome.storage.local.set({
//       isRecording: false,
//       recordingTabId: null,
//     });
//     sendResponse({ success: true });
//     return true;
//   }

//   if (message.action === "getActiveTab") {
//     chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
//       sendResponse(tabs[0]);
//     });
//     return true;
//   }

//   if (message.action === "openVideoPlayer") {
//     chrome.tabs
//       .create({
//         url: message.url,
//       })
//       .then(() => {
//         console.log("Video player opened");
//         sendResponse({ success: true });
//       })
//       .catch((error) => {
//         console.error("Error opening video player:", error);
//         sendResponse({ success: false, error: error.message });
//       });
//     return true;
//   }

//   if (message.action === "getRecordingState") {
//     // Return both recording state and tabId
//     chrome.storage.local.get(["isRecording", "recordingTabId"], (data) => {
//       sendResponse({
//         isRecording: data.isRecording || false,
//         recordingTabId: data.recordingTabId || null,
//       });
//     });
//     return true;
//   }

//   return true;
// });

// // Clean up stream when tab closes
// chrome.tabs.onRemoved.addListener((tabId) => {
//   if (activeStream) {
//     activeStream.getTracks().forEach((track) => track.stop());
//     activeStream = null;
//   }
// });

////////////////////////////////////////////////////////////
// test 4

let isRecording = false;
let recordingTabId = null;

// Listen for storage changes
chrome.storage.local.onChanged.addListener((changes) => {
  if (changes.isRecording) {
    isRecording = changes.isRecording.newValue;
  }
  if (changes.recordingTabId) {
    recordingTabId = changes.recordingTabId.newValue;
  }
});

// Initialize state from storage
chrome.storage.local.get(["isRecording", "recordingTabId"], (data) => {
  isRecording = data.isRecording || false;
  recordingTabId = data.recordingTabId || null;
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "updateBadge") {
    chrome.action.setBadgeText({
      text: message.text,
    });
    if (message.color) {
      chrome.action.setBadgeBackgroundColor({
        color: message.color,
      });
    }
    // Update internal state to match badge
    isRecording = message.text === "REC";
    sendResponse({ success: true });
  }

  if (message.action === "startRecording") {
    isRecording = true;
    recordingTabId = message.recordingTabId;
    // Also update storage
    chrome.storage.local.set({
      isRecording: true,
      recordingTabId: message.recordingTabId,
    });
    sendResponse({ success: true });
    return true;
  }

  if (message.action === "stopRecording") {
    isRecording = false;
    recordingTabId = null;
    // Also update storage
    chrome.storage.local.set({
      isRecording: false,
      recordingTabId: null,
    });
    sendResponse({ success: true });
    return true;
  }

  if (message.action === "getActiveTab") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      sendResponse(tabs[0]);
    });
    return true;
  }

  if (message.action === "openVideoPlayer") {
    chrome.tabs
      .create({
        url: message.url,
      })
      .then(() => {
        console.log("Video player opened");
        sendResponse({ success: true });
      })
      .catch((error) => {
        console.error("Error opening video player:", error);
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }

  if (message.action === "getRecordingState") {
    // Return both recording state and tabId
    chrome.storage.local.get(["isRecording", "recordingTabId"], (data) => {
      sendResponse({
        isRecording: data.isRecording || false,
        recordingTabId: data.recordingTabId || null,
      });
    });
    return true;
  }

  return true;
});

// Clean up stream when tab closes
chrome.tabs.onRemoved.addListener((tabId) => {
  if (activeStream) {
    activeStream.getTracks().forEach((track) => track.stop());
    activeStream = null;
  }
});
