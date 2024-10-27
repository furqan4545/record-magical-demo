// let isRecording = false;
// let activeTabId = null;
// let offscreenPort = null;

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

// chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
//   if (request.action === "startRecording") {
//     (async () => {
//       try {
//         activeTabId = request.tabId;
//         console.log("Recording started in tab:", activeTabId);

//         await createOffscreenDocument();
//         connectToOffscreen(); // Use the function to connect

//         // Get MediaStream ID for the tab
//         const streamId = await chrome.tabCapture.getMediaStreamId({
//           targetTabId: activeTabId,
//         });

//         // Send stream ID to offscreen document using existing port
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
//       }
//     })();
//     return true;
//   }

//   if (request.action === "stopRecording") {
//     console.log("Recording stopped. Clearing tab:", activeTabId);

//     if (offscreenPort) {
//       offscreenPort.postMessage({ type: "stop-screen-recording" });

//       // Wait a bit for the message to be processed before disconnecting
//       setTimeout(() => {
//         if (offscreenPort) {
//           offscreenPort.disconnect();
//           offscreenPort = null;
//         }
//       }, 500);
//     }

//     isRecording = false;
//     chrome.action.setBadgeText({ text: "" });
//     return true;
//   }

//   if (request.action === "getRecordingState") {
//     sendResponse({ isRecording });
//     return true;
//   }

//   if (request.type === "download-recording") {
//     if (!activeTabId) {
//       console.error("No active tab ID found for download");
//       return true;
//     }

//     try {
//       // Validate the base64 data
//       if (!request.data) {
//         throw new Error("No recording data received");
//       }

//       // Create a valid filename with date
//       const now = new Date();
//       const timestamp = now
//         .toLocaleString()
//         .replace(/[/:]/g, "-")
//         .replace(/,|\s/g, "_");
//       const filename = `screen-recording_${timestamp}.webm`;

//       // Create the download
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

//             // Clean up after successful download
//             activeTabId = null;

//             // Notify the popup that recording has stopped
//             chrome.runtime
//               .sendMessage({
//                 action: "recordingStopped",
//               })
//               .catch(() => {
//                 // Ignore errors if popup is closed
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
//           // Ignore errors if popup is closed
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

let isRecording = false;
let activeTabId = null;
let offscreenPort = null;
let recordingTabId = null; // Added to track the recording tab

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
        action: "toggleRecording",
      });
    } catch (error) {
      console.log("Could not stop camera:", error);
    }
  }
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
      } catch (error) {
        console.error("Error in startRecording:", error);
        isRecording = false;
        // Notify of error
        chrome.runtime
          .sendMessage({
            action: "recordingError",
            error: "Failed to start recording",
          })
          .catch(() => {
            /* Ignore if popup is closed */
          });
      }
    })();
    return true;
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
