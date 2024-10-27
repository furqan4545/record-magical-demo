// let isRecording = false;
// let activeTabId = null;
// let offscreenPort = null;
// let recordingTabId = null; // Added to track the recording tab
// let cleanupTimeout = null;

// async function createOffscreenDocument() {
//   if (await chrome.offscreen.hasDocument()) {
//     await chrome.offscreen.closeDocument();
//   }
//   await chrome.offscreen.createDocument({
//     url: "offscreen.html",
//     reasons: ["USER_MEDIA"],
//     justification: "Recording screen content",
//   });
// }

// function connectToOffscreen() {
//   if (offscreenPort) {
//     try {
//       offscreenPort.disconnect();
//     } catch (e) {
//       console.error("Error disconnecting port:", e);
//     }
//   }
//   offscreenPort = chrome.runtime.connect({ name: "offscreen" });
// }

// // Helper function to stop camera in the recording tab
// async function stopCameraInRecordingTab() {
//   if (recordingTabId) {
//     try {
//       // Try to execute toggleRecording message in the original tab
//       await chrome.tabs.sendMessage(recordingTabId, {
//         action: "toggleRecording",
//       });
//     } catch (error) {
//       console.log("Could not stop camera:", error);
//     }
//   }
// }

// // async function cleanupAfterCancellation() {
// //   console.log("User cancelled screen sharing. Cleaning up...");
// //   if (await chrome.offscreen.hasDocument()) {
// //     await chrome.offscreen.closeDocument();
// //   }
// //   isRecording = false;
// //   activeTabId = null;
// //   chrome.action.setBadgeText({ text: "" });
// // }

// async function cleanupAfterCancellation(reason) {
//   console.log(`Recording cancelled. Reason: ${reason}. Cleaning up...`);
//   if (await chrome.offscreen.hasDocument()) {
//     await chrome.offscreen.closeDocument();
//   }
//   isRecording = false;
//   activeTabId = null;
//   chrome.action.setBadgeText({ text: "" });
// }

// chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
//   if (request.action === "startRecording") {
//     (async () => {
//       try {
//         activeTabId = request.tabId;
//         recordingTabId = request.tabId; // Store the recording tab ID
//         console.log("Recording started in tab:", activeTabId);

//         await createOffscreenDocument();
//         connectToOffscreen();

//         const streamId = await chrome.tabCapture.getMediaStreamId({
//           targetTabId: activeTabId,
//         });

//         offscreenPort.postMessage({
//           type: "start-screen-recording",
//           data: streamId,
//         });

//         isRecording = true;
//         chrome.action.setBadgeText({ text: "REC" });
//         chrome.action.setBadgeBackgroundColor({ color: "#FF0000" });
//       } catch (error) {
//         console.error("Error in startRecording:", error);
//         isRecording = false;
//         // Notify of error
//         chrome.runtime
//           .sendMessage({
//             action: "recordingError",
//             error: "Failed to start recording",
//           })
//           .catch(() => {
//             /* Ignore if popup is closed */
//           });
//       }
//     })();
//     return true;
//   }

//   // Handle case where recording was cancelled in offscreen document
//   if (request.action === "recordingCancelled") {
//     // Then stop the camera
//     stopCameraInRecordingTab();
//     // Handle case where recording was cancelled in offscreen document.. show alert to user.
//     cleanupAfterCancellation(request.reason);
//     return true;
//   }

//   if (request.action === "stopRecording") {
//     // Don't check current tab, just stop recording
//     console.log("Recording stopped. Original recording tab:", recordingTabId);

//     if (offscreenPort) {
//       offscreenPort.postMessage({ type: "stop-screen-recording" });

//       setTimeout(() => {
//         if (offscreenPort) {
//           offscreenPort.disconnect();
//           offscreenPort = null;
//         }
//       }, 500);
//     }

//     // Then stop the camera
//     stopCameraInRecordingTab();

//     isRecording = false;
//     chrome.action.setBadgeText({ text: "" });
//     return true;
//   }

//   if (request.action === "getRecordingState") {
//     sendResponse({
//       isRecording,
//       recordingTabId, // Include the recording tab ID in the response
//     });
//     return true;
//   }

//   if (request.type === "download-recording") {
//     if (!recordingTabId) {
//       // Use recordingTabId instead of activeTabId
//       console.error("No recording tab ID found for download");
//       return true;
//     }

//     try {
//       if (!request.data) {
//         throw new Error("No recording data received");
//       }

//       const now = new Date();
//       const timestamp = now
//         .toLocaleString()
//         .replace(/[/:]/g, "-")
//         .replace(/,|\s/g, "_");
//       const filename = `screen-recording_${timestamp}.webm`;

//       chrome.downloads.download(
//         {
//           url: `data:${request.mimeType};base64,${request.data}`,
//           filename: filename,
//           saveAs: true,
//         },
//         (downloadId) => {
//           if (chrome.runtime.lastError) {
//             console.error("Download failed:", chrome.runtime.lastError);
//           } else {
//             console.log("Download started with ID:", downloadId);
//             recordingTabId = null; // Clear recording tab ID after successful download
//             activeTabId = null;

//             chrome.runtime
//               .sendMessage({
//                 action: "recordingStopped",
//               })
//               .catch(() => {
//                 /* Ignore if popup is closed */
//               });
//           }
//         }
//       );
//     } catch (error) {
//       console.error("Error initiating download:", error);
//       chrome.runtime
//         .sendMessage({
//           action: "recordingError",
//           error: "Failed to download recording",
//         })
//         .catch(() => {
//           /* Ignore if popup is closed */
//         });
//     }

//     return true;
//   }

//   if (request.action === "updateButton") {
//     isRecording = request.isRecording;
//     chrome.action.setBadgeText({
//       text: isRecording ? "REC" : "",
//     });
//     chrome.action.setBadgeBackgroundColor({
//       color: "#FF0000",
//     });
//     return true;
//   }
//   return true;
// });

// // Add handler for tab removal
// chrome.tabs.onRemoved.addListener((tabId) => {
//   if (tabId === recordingTabId) {
//     // Recording tab was closed, stop recording
//     if (offscreenPort) {
//       offscreenPort.postMessage({ type: "stop-screen-recording" });
//       setTimeout(() => {
//         if (offscreenPort) {
//           offscreenPort.disconnect();
//           offscreenPort = null;
//         }
//       }, 500);
//     }

//     // Stop the camera if possible
//     stopCameraInRecordingTab();

//     isRecording = false;
//     chrome.action.setBadgeText({ text: "" });
//     recordingTabId = null;
//   }
// });

////////////////////////////////////////////////////////////
//test

let isRecording = false;
let activeTabId = null;
let offscreenPort = null;
let recordingTabId = null; // Added to track the recording tab
let cleanupTimeout = null;

async function createOffscreenDocument() {
  if (await chrome.offscreen.hasDocument()) {
    await chrome.offscreen.closeDocument();
  }
  await chrome.offscreen.createDocument({
    url: "offscreen.html",
    reasons: ["USER_MEDIA"],
    justification: "Recording screen content",
  });
}

function connectToOffscreen() {
  if (offscreenPort) {
    try {
      offscreenPort.disconnect();
    } catch (e) {
      console.error("Error disconnecting port:", e);
    }
  }
  offscreenPort = chrome.runtime.connect({ name: "offscreen" });
}

// Helper function to stop camera in the recording tab
async function stopCameraInRecordingTab() {
  if (recordingTabId) {
    try {
      // Try to execute toggleRecording message in the original tab
      await chrome.tabs.sendMessage(recordingTabId, {
        action: "stopCamera",
      });
    } catch (error) {
      console.log("Could not stop camera:", error);
    }
  }
}

// async function cleanupAfterCancellation() {
//   console.log("User cancelled screen sharing. Cleaning up...");
//   if (await chrome.offscreen.hasDocument()) {
//     await chrome.offscreen.closeDocument();
//   }
//   isRecording = false;
//   activeTabId = null;
//   chrome.action.setBadgeText({ text: "" });
// }

async function cleanupAfterCancellation(reason) {
  console.log(`Recording cancelled. Reason: ${reason}. Cleaning up...`);
  if (await chrome.offscreen.hasDocument()) {
    await chrome.offscreen.closeDocument();
  }
  isRecording = false;
  activeTabId = null;
  chrome.action.setBadgeText({ text: "" });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "startRecording") {
    (async () => {
      try {
        activeTabId = request.tabId;
        recordingTabId = request.tabId; // Store the recording tab ID
        console.log("Recording started in tab:", activeTabId);

        await createOffscreenDocument();
        connectToOffscreen();

        const streamId = await chrome.tabCapture.getMediaStreamId({
          targetTabId: activeTabId,
        });

        offscreenPort.postMessage({
          type: "start-screen-recording",
          data: streamId,
        });

        isRecording = true;
        chrome.action.setBadgeText({ text: "REC" });
        chrome.action.setBadgeBackgroundColor({ color: "#FF0000" });
        // After successfully starting recording
        sendResponse({ success: true });
      } catch (error) {
        console.error("Error in startRecording:", error);
        isRecording = false;
        // Notify of error
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }

  // Handle case where recording was cancelled in offscreen document
  if (request.action === "recordingCancelled") {
    // Then stop the camera
    stopCameraInRecordingTab();
    // Handle case where recording was cancelled in offscreen document.. show alert to user.
    cleanupAfterCancellation(request.reason);
    return true;
  }

  if (request.action === "screenShareAllowed") {
    // Relay this message to popup.js
    chrome.runtime.sendMessage({ action: "screenShareAllowed" });
  }

  if (request.action === "stopRecording") {
    // Don't check current tab, just stop recording
    console.log("Recording stopped. Original recording tab:", recordingTabId);

    if (offscreenPort) {
      offscreenPort.postMessage({ type: "stop-screen-recording" });

      setTimeout(() => {
        if (offscreenPort) {
          offscreenPort.disconnect();
          offscreenPort = null;
        }
      }, 500);
    }

    // Then stop the camera
    stopCameraInRecordingTab();

    isRecording = false;
    chrome.action.setBadgeText({ text: "" });
    return true;
  }

  if (request.action === "getRecordingState") {
    sendResponse({
      isRecording,
      recordingTabId, // Include the recording tab ID in the response
    });
    return true;
  }

  if (request.type === "download-recording") {
    if (!recordingTabId) {
      // Use recordingTabId instead of activeTabId
      console.error("No recording tab ID found for download");
      return true;
    }

    try {
      if (!request.data) {
        throw new Error("No recording data received");
      }

      const now = new Date();
      const timestamp = now
        .toLocaleString()
        .replace(/[/:]/g, "-")
        .replace(/,|\s/g, "_");
      const filename = `screen-recording_${timestamp}.webm`;

      chrome.downloads.download(
        {
          url: `data:${request.mimeType};base64,${request.data}`,
          filename: filename,
          saveAs: true,
        },
        (downloadId) => {
          if (chrome.runtime.lastError) {
            console.error("Download failed:", chrome.runtime.lastError);
          } else {
            console.log("Download started with ID:", downloadId);
            recordingTabId = null; // Clear recording tab ID after successful download
            activeTabId = null;

            chrome.runtime
              .sendMessage({
                action: "recordingStopped",
              })
              .catch(() => {
                /* Ignore if popup is closed */
              });
          }
        }
      );
    } catch (error) {
      console.error("Error initiating download:", error);
      chrome.runtime
        .sendMessage({
          action: "recordingError",
          error: "Failed to download recording",
        })
        .catch(() => {
          /* Ignore if popup is closed */
        });
    }

    return true;
  }

  if (request.action === "updateButton") {
    isRecording = request.isRecording;
    chrome.action.setBadgeText({
      text: isRecording ? "REC" : "",
    });
    chrome.action.setBadgeBackgroundColor({
      color: "#FF0000",
    });
    return true;
  }
  return true;
});

// Add handler for tab removal
chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === recordingTabId) {
    // Recording tab was closed, stop recording
    if (offscreenPort) {
      offscreenPort.postMessage({ type: "stop-screen-recording" });
      setTimeout(() => {
        if (offscreenPort) {
          offscreenPort.disconnect();
          offscreenPort = null;
        }
      }, 500);
    }

    // Stop the camera if possible
    stopCameraInRecordingTab();

    isRecording = false;
    chrome.action.setBadgeText({ text: "" });
    recordingTabId = null;
  }
});
