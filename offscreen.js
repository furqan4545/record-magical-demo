////////////////////////////////////////////////////////////////

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

async function startRecording(streamId) {
  try {
    if (recorder?.state === "recording") {
      console.log("Already recording, stopping previous recording");
      await stopRecording();
    }

    console.log("Starting recording with streamId:", streamId);

    // Get audio stream using getUserMedia
    const audioStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    });

    console.log("Audio stream obtained:", audioStream);

    // Get display stream using getDisplayMedia
    displayStream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        displaySurface: "monitor",
        logicalSurface: true,
        cursor: "always",
      },
    });

    console.log("Display stream obtained:", displayStream);

    // Combine audio and video tracks
    combinedStream = new MediaStream([
      ...displayStream.getVideoTracks(),
      ...audioStream.getAudioTracks(),
    ]);

    console.log("Combined stream:", combinedStream);

    // Create and start recorder
    recorder = new MediaRecorder(combinedStream, {
      mimeType: "video/webm;codecs=vp8,opus",
      videoBitsPerSecond: 2500000,
      audioBitsPerSecond: 128000,
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
  } catch (err) {
    console.error("Error starting recording:", err);
    throw err;
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

// Handle messages from the extension
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "check-recording-status") {
    sendResponse({
      isRecording: recorder?.state === "recording",
    });
  }
  return true;
});
