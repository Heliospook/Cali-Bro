import React, { useRef, useEffect } from 'react';

export const ImageWithLines = ({ imageUrl, lines }) => {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    const image = new Image();
    image.src = imageUrl;

    image.onload = () => {
      // Set target width to half the screen width
      const targetWidth = window.innerWidth / 2.5;
      const scaleFactor = targetWidth / image.width;
      const scaledWidth = image.width * scaleFactor;
      const scaledHeight = image.height * scaleFactor;
      canvas.width = scaledWidth;
      canvas.height = scaledHeight;
      context.drawImage(image, 0, 0, scaledWidth, scaledHeight);
      context.strokeStyle = 'red';
      context.lineWidth = 2;

      lines.forEach(([start, end]) => {
        const [x1, y1] = start;
        const [x2, y2] = end;

        const absX1 = x1 * scaledWidth / 100;
        const absY1 = y1 * scaledHeight / 100;
        const absX2 = x2 * scaledWidth / 100;
        const absY2 = y2 * scaledHeight / 100;

        context.beginPath();
        context.moveTo(absX1, absY1);
        context.lineTo(absX2, absY2);
        context.stroke();
      });
    };
  }, [imageUrl, lines]);

  return <canvas ref={canvasRef} />;
};



export const ImageOverlayWithHomography = ({ imageUrl1, imageUrl2, homographyMatrix }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const img1 = new Image();
    const img2 = new Image();

    img1.src = imageUrl1;
    img2.src = imageUrl2;

    img1.onload = () => {
      img2.onload = () => {
        // Set canvas size to fit within half the screen width
        const maxWidth = window.innerWidth / 2;
        const scaleFactor = Math.min(maxWidth / img1.width, maxWidth / img2.width, 1);

        canvas.width = img2.width * scaleFactor;
        canvas.height = img2.height * scaleFactor;

        // Draw img2 as the background with reduced opacity
        ctx.globalAlpha = 0.5;
        ctx.drawImage(img2, 0, 0, img2.width * scaleFactor, img2.height * scaleFactor);
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'blue'; // Border color for image 2
        ctx.strokeRect(0, 0, img2.width * scaleFactor, img2.height * scaleFactor);

        // Apply homography transformation with scaling for img1
        const [m11, m12, m13, m21, m22, m23, m31, m32, m33] = homographyMatrix.flat();
        ctx.setTransform(
          m11 * scaleFactor, m21 * scaleFactor,
          m12 * scaleFactor, m22 * scaleFactor,
          m13 * scaleFactor, m23 * scaleFactor
        );

        // Draw img1 with reduced opacity and scaled transformation
        ctx.globalAlpha = 0.5;
        ctx.drawImage(img1, 0, 0, img1.width, img1.height);
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'red'; // Border color for image 1
        ctx.strokeRect(0, 0, img1.width, img1.height);

        // Reset transformations and opacity
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = 1;
      };
    };
  }, [imageUrl1, imageUrl2, homographyMatrix]);

  return <canvas ref={canvasRef} style={{ border: '1px solid black', width: '50%' }} />;
};


