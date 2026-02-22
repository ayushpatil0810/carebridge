// ============================================================
// VoiceInput — Microphone Recording + Sarvam Speech-to-Text
// ============================================================
// Uses Web MediaRecorder API to record audio, then sends
// to Sarvam STT for multilingual transcription.
// Provides manual editing fallback if AI fails.
// ============================================================

import { useState, useRef, useCallback } from 'react';
import { Mic, MicOff, Loader2, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { speechToText, isSarvamAvailable } from '../services/sarvamService';

export default function VoiceInput({ onTranscript, disabled = false }) {
    const { t, i18n } = useTranslation();
    const [recording, setRecording] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState('');
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);
    const streamRef = useRef(null);

    const startRecording = useCallback(async () => {
        setError('');

        if (!isSarvamAvailable()) {
            setError(t('sarvam.apiKeyMissing', 'Sarvam API key not configured.'));
            return;
        }

        // Check browser support
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            setError(t('sarvam.micNotSupported', 'Microphone not supported in this browser.'));
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1,
                    sampleRate: 16000,
                    echoCancellation: true,
                    noiseSuppression: true,
                },
            });
            streamRef.current = stream;
            chunksRef.current = [];

            // Prefer webm/opus, fall back to wav
            const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                ? 'audio/webm;codecs=opus'
                : MediaRecorder.isTypeSupported('audio/webm')
                    ? 'audio/webm'
                    : 'audio/wav';

            const recorder = new MediaRecorder(stream, { mimeType });
            mediaRecorderRef.current = recorder;

            recorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            recorder.onstop = async () => {
                // Stop all tracks
                stream.getTracks().forEach(track => track.stop());
                streamRef.current = null;

                const audioBlob = new Blob(chunksRef.current, { type: mimeType });
                chunksRef.current = [];

                if (audioBlob.size === 0) {
                    setError(t('sarvam.emptyRecording', 'No audio was recorded.'));
                    return;
                }

                // Send to Sarvam STT
                setProcessing(true);
                try {
                    const result = await speechToText(audioBlob, i18n.language);
                    if (result.transcript) {
                        onTranscript(result.transcript);
                    } else {
                        setError(t('sarvam.noTranscript', 'No speech detected. Please try again.'));
                    }
                } catch (err) {
                    console.error('STT error:', err);
                    if (err.message === 'SARVAM_RATE_LIMITED') {
                        setError(t('sarvam.rateLimited', 'Rate limit reached. Please wait a moment.'));
                    } else if (err.message === 'SARVAM_TIMEOUT') {
                        setError(t('sarvam.timeout', 'Request timed out. Please try again.'));
                    } else if (err.message === 'SARVAM_API_KEY_MISSING') {
                        setError(t('sarvam.apiKeyMissing', 'Sarvam API key not configured.'));
                    } else {
                        setError(t('sarvam.sttFailed', 'Voice recognition failed. Please type manually.'));
                    }
                } finally {
                    setProcessing(false);
                }
            };

            recorder.start(250); // collect data every 250ms
            setRecording(true);
        } catch (err) {
            console.error('Microphone access error:', err);
            if (err.name === 'NotAllowedError') {
                setError(t('sarvam.micDenied', 'Microphone access denied. Please allow microphone access.'));
            } else {
                setError(t('sarvam.micError', 'Could not access microphone.'));
            }
        }
    }, [onTranscript, t, i18n.language]);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
        setRecording(false);
    }, []);

    const handleClick = () => {
        if (processing) return;
        if (recording) {
            stopRecording();
        } else {
            startRecording();
        }
    };

    return (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <button
                type="button"
                className={`btn btn-sm ${recording ? 'btn-danger' : 'btn-secondary'}`}
                onClick={handleClick}
                disabled={disabled || processing}
                title={recording
                    ? t('sarvam.stopRecording', 'Stop recording')
                    : t('sarvam.startRecording', 'Start voice input')}
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    ...(recording ? {
                        animation: 'pulse 1.5s ease-in-out infinite',
                        boxShadow: '0 0 0 3px rgba(220, 38, 38, 0.2)',
                    } : {}),
                }}
            >
                {processing ? (
                    <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                ) : recording ? (
                    <MicOff size={16} />
                ) : (
                    <Mic size={16} />
                )}
                {processing
                    ? t('sarvam.processing', 'Processing...')
                    : recording
                        ? t('sarvam.stopBtn', 'Stop')
                        : t('sarvam.voiceBtn', 'Voice')}
            </button>

            {error && (
                <span style={{
                    fontSize: '0.75rem',
                    color: 'var(--alert-red)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    maxWidth: '280px',
                }}>
                    <AlertTriangle size={12} />
                    {error}
                </span>
            )}
        </div>
    );
}
