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

// // Helper function to stop camera in the recording tab
// async function stopCameraInRecordingTab(recordingTabId) {
//   if (recordingTabId) {
//     try {
//       // Try to execute toggleRecording message in the original tab
//       await chrome.tabs.sendMessage(recordingTabId, {
//         action: "stopCamera",
//       });
//     } catch (error) {
//       console.log("Could not stop camera:", error);
//     }
//   }
// }

// async function cleanupAfterCancellation(reason) {
//   console.log(`Recording cancelled. Reason: ${reason}. Cleaning up...`);
//   if (await chrome.offscreen.hasDocument()) {
//     await chrome.offscreen.closeDocument();
//   }
//   // Reset state in chrome.storage
//   chrome.storage.local.set({
//     isRecording: false,
//     includeCamera: false,
//     includeAudio: true,
//     recordingTabId: null,
//   });
//   chrome.action.setBadgeText({ text: "" });
// }

// chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
//   if (request.action === "startRecording") {
//     (async () => {
//       try {
//         const activeTabId = request.tabId;
//         const recordingTabId = request.tabId; // Store the recording tab ID
//         const includeCamera = request.includeCamera;
//         const includeAudio = request.includeAudio;

//         console.log("Recording started in tab:", activeTabId);

//         await createOffscreenDocument();
//         connectToOffscreen();

//         const streamId = await chrome.tabCapture.getMediaStreamId({
//           targetTabId: activeTabId,
//         });

//         offscreenPort.postMessage({
//           type: "start-screen-recording",
//           data: {
//             streamId: streamId,
//             includeAudio: includeAudio, // Pass the audio preference
//           },
//         });

//         // Update state in chrome.storage
//         chrome.storage.local.set({
//           isRecording: true,
//           includeCamera: includeCamera,
//           includeAudio: includeAudio,
//           recordingTabId: recordingTabId,
//         });

//         chrome.action.setBadgeText({ text: "REC" });
//         chrome.action.setBadgeBackgroundColor({ color: "#FF0000" });
//         // After successfully starting recording
//         sendResponse({ success: true });
//       } catch (error) {
//         console.error("Error in startRecording:", error);
//         // Update state in chrome.storage
//         chrome.storage.local.set({
//           isRecording: false,
//           includeCamera: false,
//           includeAudio: true,
//           recordingTabId: null,
//         });
//         // Notify of error
//         sendResponse({ success: false, error: error.message });
//       }
//     })();
//     return true;
//   }

//   if (request.action === "recordingCancelled") {
//     // Then stop the camera
//     chrome.storage.local.get(
//       ["includeCamera", "recordingTabId"],
//       ({ includeCamera, recordingTabId }) => {
//         if (includeCamera) {
//           stopCameraInRecordingTab(recordingTabId);
//         }
//         // Handle cancellation
//         cleanupAfterCancellation(request.reason);
//       }
//     );
//     return true;
//   }

//   if (request.action === "screenShareAllowed") {
//     // Get the includeCamera and recordingTabId from chrome.storage.local
//     chrome.storage.local.get(
//       ["includeCamera", "recordingTabId"],
//       async (data) => {
//         const includeCamera = data.includeCamera;
//         const recordingTabId = data.recordingTabId;

//         if (includeCamera && recordingTabId) {
//           // Inject content script and start camera
//           try {
//             await chrome.scripting.executeScript({
//               target: { tabId: recordingTabId },
//               files: ["content.js"],
//             });
//             await chrome.tabs.sendMessage(recordingTabId, {
//               action: "startCamera",
//             });
//           } catch (error) {
//             console.log("Could not inject content script:", error);
//           }
//         }
//       }
//     );

//     // No need to relay the message to popup.js anymore
//     return true;
//   }

//   // Stop recording
//   if (request.action === "stopRecording") {
//     // Don't check current tab, just stop recording
//     console.log("Stopping recording");

//     // Get the current state from chrome.storage
//     chrome.storage.local.get(
//       ["includeCamera", "recordingTabId"],
//       ({ includeCamera, recordingTabId }) => {
//         if (offscreenPort) {
//           offscreenPort.postMessage({ type: "stop-screen-recording" });

//           setTimeout(() => {
//             if (offscreenPort) {
//               offscreenPort.disconnect();
//               offscreenPort = null;
//             }
//           }, 500);
//         }

//         // Then stop the camera if it was started
//         if (includeCamera) {
//           stopCameraInRecordingTab(recordingTabId);
//         }

//         // Reset state in chrome.storage
//         chrome.storage.local.set({
//           isRecording: false,
//           includeCamera: false,
//           includeAudio: true,
//           recordingTabId: null,
//         });

//         chrome.action.setBadgeText({ text: "" });
//       }
//     );

//     return true;
//   }

//   if (request.action === "getRecordingState") {
//     // Get state from chrome.storage
//     chrome.storage.local.get(
//       ["isRecording", "includeCamera", "includeAudio", "recordingTabId"],
//       (data) => {
//         sendResponse(data);
//       }
//     );
//     return true; // Indicates that sendResponse will be called asynchronously
//   }

//   if (request.type === "download-recording") {
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
//     chrome.storage.local.get(["isRecording"], ({ isRecording }) => {
//       chrome.action.setBadgeText({
//         text: isRecording ? "REC" : "",
//       });
//       chrome.action.setBadgeBackgroundColor({
//         color: "#FF0000",
//       });
//     });
//     return true;
//   }
//   return true;
// });

// // Add handler for tab removal
// chrome.tabs.onRemoved.addListener((tabId) => {
//   // Get the current state from chrome.storage
//   chrome.storage.local.get(
//     ["recordingTabId", "includeCamera"],
//     ({ recordingTabId, includeCamera }) => {
//       if (tabId === recordingTabId) {
//         // Recording tab was closed, stop recording
//         if (offscreenPort) {
//           offscreenPort.postMessage({ type: "stop-screen-recording" });
//           setTimeout(() => {
//             if (offscreenPort) {
//               offscreenPort.disconnect();
//               offscreenPort = null;
//             }
//           }, 500);
//         }

//         // Stop the camera if possible
//         if (includeCamera) {
//           stopCameraInRecordingTab(recordingTabId);
//         }

//         // Reset state in chrome.storage
//         chrome.storage.local.set({
//           isRecording: false,
//           includeCamera: false,
//           includeAudio: true,
//           recordingTabId: null,
//         });

//         chrome.action.setBadgeText({ text: "" });
//       }
//     }
//   );
// });
////////////////////////////////////////////////////////////
//test

let offscreenPort = null;

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
async function stopCameraInRecordingTab(recordingTabId) {
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

async function cleanupAfterCancellation(reason) {
  console.log(`Recording cancelled. Reason: ${reason}. Cleaning up...`);
  if (await chrome.offscreen.hasDocument()) {
    await chrome.offscreen.closeDocument();
  }
  // Reset state in chrome.storage
  chrome.storage.local.set({
    isRecording: false,
    includeCamera: false,
    includeAudio: true,
    recordingTabId: null,
  });
  chrome.action.setBadgeText({ text: "" });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "startRecording") {
    (async () => {
      try {
        const activeTabId = request.tabId;
        const recordingTabId = request.tabId; // Store the recording tab ID
        const includeCamera = request.includeCamera;
        const includeAudio = request.includeAudio;

        console.log("Recording started in tab:", activeTabId);

        await createOffscreenDocument();
        connectToOffscreen();

        const streamId = await chrome.tabCapture.getMediaStreamId({
          targetTabId: activeTabId,
        });

        offscreenPort.postMessage({
          type: "start-screen-recording",
          data: {
            streamId: streamId,
            includeAudio: includeAudio, // Pass the audio preference
          },
        });

        // Update state in chrome.storage
        chrome.storage.local.set({
          isRecording: true,
          includeCamera: includeCamera,
          includeAudio: includeAudio,
          recordingTabId: recordingTabId,
        });

        chrome.action.setBadgeText({ text: "REC" });
        chrome.action.setBadgeBackgroundColor({ color: "#FF0000" });
        // After successfully starting recording
        sendResponse({ success: true });
      } catch (error) {
        console.error("Error in startRecording:", error);
        // Update state in chrome.storage
        chrome.storage.local.set({
          isRecording: false,
          includeCamera: false,
          includeAudio: true,
          recordingTabId: null,
        });
        // Notify of error
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }

  if (request.action === "recordingCancelled") {
    // Then stop the camera
    chrome.storage.local.get(
      ["includeCamera", "recordingTabId"],
      ({ includeCamera, recordingTabId }) => {
        if (includeCamera) {
          stopCameraInRecordingTab(recordingTabId);
        }
        // Handle cancellation
        cleanupAfterCancellation(request.reason);
      }
    );
    return true;
  }

  if (request.action === "screenShareAllowed") {
    // Get the includeCamera and recordingTabId from chrome.storage.local
    chrome.storage.local.get(
      ["includeCamera", "recordingTabId"],
      async (data) => {
        const includeCamera = data.includeCamera;
        const recordingTabId = data.recordingTabId;

        if (includeCamera && recordingTabId) {
          // Inject content script and start camera
          try {
            await chrome.scripting.executeScript({
              target: { tabId: recordingTabId },
              files: ["content.js"],
            });
            await chrome.tabs.sendMessage(recordingTabId, {
              action: "startCamera",
            });
          } catch (error) {
            console.log("Could not inject content script:", error);
          }
        }
      }
    );

    // No need to relay the message to popup.js anymore
    return true;
  }

  // Stop recording
  if (request.action === "stopRecording") {
    // Don't check current tab, just stop recording
    console.log("Stopping recording");

    // Get the current state from chrome.storage
    chrome.storage.local.get(
      ["includeCamera", "recordingTabId"],
      ({ includeCamera, recordingTabId }) => {
        if (offscreenPort) {
          offscreenPort.postMessage({ type: "stop-screen-recording" });

          setTimeout(() => {
            if (offscreenPort) {
              offscreenPort.disconnect();
              offscreenPort = null;
            }
          }, 500);
        }

        // Then stop the camera if it was started
        if (includeCamera) {
          stopCameraInRecordingTab(recordingTabId);
        }

        // Reset state in chrome.storage
        chrome.storage.local.set({
          isRecording: false,
          includeCamera: false,
          includeAudio: true,
          recordingTabId: null,
        });

        chrome.action.setBadgeText({ text: "" });
      }
    );

    return true;
  }

  if (request.action === "getRecordingState") {
    // Get state from chrome.storage
    chrome.storage.local.get(
      ["isRecording", "includeCamera", "includeAudio", "recordingTabId"],
      (data) => {
        sendResponse(data);
      }
    );
    return true; // Indicates that sendResponse will be called asynchronously
  }

  if (request.type === "download-recording") {
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
    chrome.storage.local.get(["isRecording"], ({ isRecording }) => {
      chrome.action.setBadgeText({
        text: isRecording ? "REC" : "",
      });
      chrome.action.setBadgeBackgroundColor({
        color: "#FF0000",
      });
    });
    return true;
  }
  return true;
});

// Add handler for tab removal
chrome.tabs.onRemoved.addListener((tabId) => {
  // Get the current state from chrome.storage
  chrome.storage.local.get(
    ["recordingTabId", "includeCamera"],
    ({ recordingTabId, includeCamera }) => {
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
        if (includeCamera) {
          stopCameraInRecordingTab(recordingTabId);
        }

        // Reset state in chrome.storage
        chrome.storage.local.set({
          isRecording: false,
          includeCamera: false,
          includeAudio: true,
          recordingTabId: null,
        });

        chrome.action.setBadgeText({ text: "" });
      }
    }
  );
});
