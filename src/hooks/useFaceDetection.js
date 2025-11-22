import { useState, useEffect, useRef, useCallback } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as blazeface from '@tensorflow-models/blazeface';

export function useFaceDetection(videoRef, isActive = true) {
  const [model, setModel] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [faceData, setFaceData] = useState({
    detected: false,
    centered: false,
    position: null,
    landmarks: null,
    confidence: 0
  });

  const animationRef = useRef(null);
  const isRunningRef = useRef(false);

  // Load the BlazeFace model
  useEffect(() => {
    let isMounted = true;

    const loadModel = async () => {
      try {
        await tf.ready();
        const loadedModel = await blazeface.load();

        if (isMounted) {
          setModel(loadedModel);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Failed to load BlazeFace model:', err);
        if (isMounted) {
          setError(err.message);
          setIsLoading(false);
        }
      }
    };

    loadModel();

    return () => {
      isMounted = false;
    };
  }, []);

  // Check if face is properly centered in the frame
  const checkFaceCentered = useCallback((face, videoWidth, videoHeight) => {
    if (!face) return false;

    const [x1, y1] = face.topLeft;
    const [x2, y2] = face.bottomRight;

    const faceWidth = x2 - x1;
    const faceHeight = y2 - y1;
    const faceCenterX = x1 + faceWidth / 2;
    const faceCenterY = y1 + faceHeight / 2;

    const videoCenterX = videoWidth / 2;
    const videoCenterY = videoHeight / 2;

    // Check if face center is within 15% of video center
    const toleranceX = videoWidth * 0.15;
    const toleranceY = videoHeight * 0.15;

    const isCenteredX = Math.abs(faceCenterX - videoCenterX) < toleranceX;
    const isCenteredY = Math.abs(faceCenterY - videoCenterY) < toleranceY;

    // Check if face size is appropriate (not too close or too far)
    const faceArea = faceWidth * faceHeight;
    const videoArea = videoWidth * videoHeight;
    const faceRatio = faceArea / videoArea;

    const isProperSize = faceRatio > 0.05 && faceRatio < 0.4;

    return isCenteredX && isCenteredY && isProperSize;
  }, []);

  // Run face detection
  const detectFace = useCallback(async () => {
    if (!model || !videoRef?.current || !isActive) return;

    const video = videoRef.current;

    if (video.readyState !== 4) return;

    try {
      const predictions = await model.estimateFaces(video, false);

      if (predictions.length > 0) {
        const face = predictions[0];
        const videoWidth = video.videoWidth;
        const videoHeight = video.videoHeight;

        const isCentered = checkFaceCentered(face, videoWidth, videoHeight);

        setFaceData({
          detected: true,
          centered: isCentered,
          position: {
            topLeft: face.topLeft,
            bottomRight: face.bottomRight,
            width: face.bottomRight[0] - face.topLeft[0],
            height: face.bottomRight[1] - face.topLeft[1]
          },
          landmarks: face.landmarks,
          confidence: face.probability[0]
        });
      } else {
        setFaceData({
          detected: false,
          centered: false,
          position: null,
          landmarks: null,
          confidence: 0
        });
      }
    } catch (err) {
      console.error('Face detection error:', err);
    }
  }, [model, videoRef, isActive, checkFaceCentered]);

  // Run detection loop
  useEffect(() => {
    if (!model || !isActive) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        isRunningRef.current = false;
      }
      return;
    }

    const runDetection = async () => {
      if (!isRunningRef.current) return;

      await detectFace();
      animationRef.current = requestAnimationFrame(runDetection);
    };

    isRunningRef.current = true;
    runDetection();

    return () => {
      isRunningRef.current = false;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [model, isActive, detectFace]);

  return {
    isLoading,
    error,
    faceData,
    isModelReady: !!model
  };
}
