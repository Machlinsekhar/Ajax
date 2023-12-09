import React, { useState, useRef } from 'react';
import axios from 'axios';
// import { AudioRecorder } from 'react-audio-voice-recorder';
import axiosRetry from 'axios-retry';
import Recorder from 'recorder-js';
// import pcmUtil from 'pcm-util';
// import { saveAs } from 'file-saver';
// import { blobToArrayBuffer, arrayBufferToBlob } from 'blob-util';


const App = () => {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [audioFile, setAudioFile] = useState(null);
  const [transcript, setTranscript] = useState('');
  const API_KEY = "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";
  const API_TranscriptKEY = "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";
  const recorder = useRef(null);

  axiosRetry(axios, { retries: 3, retryDelay: axiosRetry.exponentialDelay });

  const handleRecordingStart = () => {
    // If the recorder is not initialized or has been closed, create a new one
    if (!recorder.current || recorder.current.state === 'closed') {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      recorder.current = new Recorder(audioContext);
    }
  
    // Check if the recorder is already recording
    if (recorder.current.state === 'recording') {
      console.warn('Recorder is already recording');
      return;
    }
  
    // Start recording
    recorder.current.start().then(() => {
      console.log('Recording started');
    }).catch((error) => {
      console.error('Error starting recording:', error);
      // Handle the error as needed
    });
  };
  
  
  

  const handleRecordingStop = async () => {
    // Check if the recorder is currently recording
    if (recorder.current && recorder.current.state === 'recording') {
      // Stop recording
      const audioData = await recorder.current.stop();
      const audioBlob = await audioData.audio;
  
      // Set the audio file and send it to the server
      setAudioFile(audioBlob);
      await sendAudioToServer(audioBlob);
  
      // Clean up the recorder
      recorder.current.close();
      recorder.current = null;
    } else {
      console.warn('Recorder is not currently recording');
    }
  };
  

  const sendAudioToServer = async (blob) => {
    const formData = new FormData();
    formData.append('file', blob);
    formData.append('model', 'whisper-1');
    formData.append('response_format', 'text');

    try {
      const response = await axios.post(
        'https://api.openai.com/v1/audio/transcriptions',
        formData,
        {
          headers: {
            "Authorization": `Bearer ${API_TranscriptKEY}`,
            "Content-Type": 'multipart/form-data',
          },
        }
      );

      if (response.status === 200) {
        const data = response.data;
        console.log('Transcription:', data.transcription);
        setQuery(data.transcription);
      } else {
        console.error('Transcription failed.');
      }
    } catch (error) {
      console.error('Error sending audio to server:', error);
    }
  };

  
  // const handleRecordingComplete = async (audioData) => {
  //   try {
  //     if (!(audioData.blob instanceof Blob)) {
  //       throw new Error('Invalid Blob hai ye');
  //     }

  //     // Convert the audio blob to WAV format
  //     const wavBlob = await convertToWAV(audioData.blob);
  //     setAudioFile(wavBlob);
  //     await sendAudioToServer(wavBlob);
  //   } catch (error) {
  //     console.error('Error handling recording:', error);
  //   }
  // };

  // const convertToWAV = async (blob) => {
  //   return new Promise((resolve) => {
  //     const audioRecorder = new AudioRecorder();
  //     const reader = new FileReader();

  //     reader.onloadend = () => {
  //       // Decode audio data to PCM format
  //       const pcmData = pcmUtil.decode(reader.result, { stereo: true, sampleRate: 16000 });

  //       // Encode PCM data to WAV format
  //       const wavBlob = pcmUtil.encode(pcmData, { sampleRate: 16000 });

  //       resolve(wavBlob);
  //     };

  //     reader.readAsArrayBuffer(blob);
  //   });
  // };

  const handleQueryChange = (event) => {
    setQuery(event.target.value);
  };

  // const sendAudioToServer = async (blob) => {
  //   // const file = new File([blob], 'audio.mp3', { type: blob.type });

  //   const formData = new FormData();
  //   formData.append('model', 'whisper-1');
  //   formData.append('file', blob, 'audio.wav');
  //   // formData.append('response_format', 'text');

  //   try {
  //     const response = await axios.post(
  //       'https://api.openai.com/v1/audio/transcriptions',
  //       formData,
  //       {
  //         headers: {
  //           "Authorization": `Bearer ${API_TranscriptKEY}`,
  //           "Content-Type": 'multipart/form-data',
  //         },
  //       }
  //     );

  //     if (response.status === 200) {
  //       const data = response.data;
  //       setTranscript(data.transcription);
  //       setQuery(data.transcription);
  //     } else {
  //       console.error('Transcription failed.');
  //     }
  //   } catch (error) {
  //     console.error('Error sending audio to server:', error);
  //   }

  // };

  const waitForCompletion = async (threadId, runId) => {
    while (true) {
      try {
        const response = await axios.get(`https://api.openai.com/v1/threads/${threadId}/runs/${runId}`, {
          headers: {
            "Authorization": `Bearer ${API_KEY}`,
            "OpenAI-Beta": "assistants=v1",
          },
        });

        const run = response.data;
        if (run.completed_at) {
          console.log("Run completed");
          break;
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error("Error checking run status:", error);
        break;
      }
    }
  };

  const handleQuerySubmit = async (event) => {
    event.preventDefault();

    const API_Body = {
      "assistant_id": "asst_Po9xlahc0bNt7EojFwqSPCSo",
      "thread": {
        "messages": [
          { "role": "user", "content": query }
        ]
      }
    };

    try {
      const response = await axios.post("https://api.openai.com/v1/threads/runs", API_Body, {
        headers: {
          "Authorization": `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
          "OpenAI-Beta": "assistants=v1",
        },
      });

      const data = response.data;
      await waitForCompletion(data.thread_id, data.id);

      const messagesResponse = await axios.get(`https://api.openai.com/v1/threads/${data.thread_id}/messages`, {
        headers: {
          "Authorization": `Bearer ${API_KEY}`,
          "OpenAI-Beta": "assistants=v1",
        },
      });

      const messagesData = messagesResponse.data.data || [];
      const assistantResponse = messagesData.map(message => message.content[0].text.value).join(' ');

      setResponse(assistantResponse);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  return (
    <div>
      <h1>Welcome to Tusk, may I know your query?</h1>

      <form onSubmit={handleQuerySubmit}>
        <label>
          Enter your query:
          <input type="text" value={query} onChange={handleQueryChange} />
        </label>
        <div>
        <button style={{margin: "1em"}} onClick={handleRecordingStart}>Start Recording</button>
      <button onClick={handleRecordingStop}>Stop Recording</button>
      {audioFile && (
        <audio controls>
          <source src={URL.createObjectURL(audioFile)} type="audio/wav" />
        </audio>
      )}

          {/* {transcript && <p>Transcription: {transcript}</p>} */}
        </div>
        <button type="submit">Submit</button>
      </form>

      {response && <p>{response}</p>}
    </div>
  );
};

export default App;
