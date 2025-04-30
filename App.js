import React, { useState, useEffect, useRef } from 'react';
import { Box, Container, Typography, Button, Paper, CircularProgress } from '@mui/material';
import { Mic, MicOff, PlayArrow, Pause } from '@mui/icons-material';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

function App() {
    const [isRecording, setIsRecording] = useState(false);
    const [audioContext, setAudioContext] = useState(null);
    const [analyzer, setAnalyzer] = useState(null);
    const [feedback, setFeedback] = useState('');
    const [pitchData, setPitchData] = useState([]);
    const [isPlaying, setIsPlaying] = useState(false);
    const mediaStreamRef = useRef(null);
    const wsRef = useRef(null);

    useEffect(() => {
        // Initialize WebSocket connection
        wsRef.current = new WebSocket('ws://localhost:8000/ws');

        wsRef.current.onmessage = (event) => {
            const data = JSON.parse(event.data);
            setFeedback(data.feedback);
            // Update pitch visualization
            setPitchData(prev => [...prev, data.pitch_accuracy].slice(-50));
        };

        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, []);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;

            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            setAudioContext(audioCtx);

            const source = audioCtx.createMediaStreamSource(stream);
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 2048;
            source.connect(analyser);
            setAnalyzer(analyser);

            setIsRecording(true);
            processAudio(analyser);
        } catch (err) {
            console.error('Error accessing microphone:', err);
        }
    };

    const stopRecording = () => {
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
        }
        if (audioContext) {
            audioContext.close();
        }
        setIsRecording(false);
    };

    const processAudio = (analyser) => {
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const processFrame = () => {
            if (!isRecording) return;

            analyser.getByteFrequencyData(dataArray);
            // Send audio data to WebSocket
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.send(dataArray);
            }

            requestAnimationFrame(processFrame);
        };

        processFrame();
    };

    const chartData = {
        labels: pitchData.map((_, i) => i),
        datasets: [
            {
                label: 'Pitch Accuracy',
                data: pitchData,
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1
            }
        ]
    };

    return (
        <Container maxWidth="md">
            <Box sx={{ my: 4 }}>
                <Typography variant="h3" component="h1" gutterBottom align="center">
                    AI Smart Karaoke Coach
                </Typography>

                <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 3 }}>
                        <Button
                            variant="contained"
                            color={isRecording ? 'secondary' : 'primary'}
                            startIcon={isRecording ? <MicOff /> : <Mic />}
                            onClick={isRecording ? stopRecording : startRecording}
                        >
                            {isRecording ? 'Stop Recording' : 'Start Recording'}
                        </Button>

                        <Button
                            variant="contained"
                            color={isPlaying ? 'secondary' : 'primary'}
                            startIcon={isPlaying ? <Pause /> : <PlayArrow />}
                            onClick={() => setIsPlaying(!isPlaying)}
                        >
                            {isPlaying ? 'Pause' : 'Play'}
                        </Button>
                    </Box>

                    {isRecording && (
                        <Box sx={{ mb: 3 }}>
                            <Line data={chartData} />
                        </Box>
                    )}

                    {feedback && (
                        <Typography variant="body1" sx={{ mt: 2 }}>
                            Feedback: {feedback}
                        </Typography>
                    )}
                </Paper>
            </Box>
        </Container>
    );
}

export default App; 