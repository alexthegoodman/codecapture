import { Composition } from 'remotion';
import { Sequence, Audio, Img, interpolate, useCurrentFrame, spring } from 'remotion';
import React from 'react';

const TRANSITION_DURATION = 15;

const Slide = ({ imageSrc, audioSrc, startFrom }) => {
    const frame = useCurrentFrame();
    
    // Fade in/out animation
    const opacity = interpolate(
        frame,
        [startFrom, startFrom + TRANSITION_DURATION, startFrom + 30],
        [0, 1, 1],
        {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
        }
    );

    // Subtle zoom animation
    const scale = spring({
        frame: frame - startFrom,
        from: 1.1,
        to: 1,
        fps: 30,
        config: {
            damping: 100,
            stiffness: 200,
            mass: 0.5,
        },
    });

    return (
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Img
                src={imageSrc}
                style={{
                    opacity,
                    transform: `scale(${scale})`,
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                }}
            />
            <Audio src={audioSrc} />
        </div>
    );
};

const SlideShow = ({ audioFiles = [], imageFiles = [], audioDurations = [] }) => {
    if (!audioFiles.length || !imageFiles.length) {
        console.warn('No files provided to SlideShow');
        return null;
    }

    // Calculate start frames for each sequence
    const startFrames = audioDurations.reduce((acc, duration, i) => {
        acc[i] = i === 0 ? 0 : acc[i - 1] + audioDurations[i - 1];
        return acc;
    }, {});

    const totalDuration = audioDurations.reduce((a, b) => a + b, 0);

    return (
        <div style={{ flex: 1, backgroundColor: 'white', width: 1920, height: 1080 }}>
            {imageFiles.map((img, i) => (
                <Sequence
                    from={startFrames[i]}
                    durationInFrames={audioDurations[i]}
                    key={i}
                    width={1920}
                    height={1080}
                >
                    <Slide
                        imageSrc={img}
                        audioSrc={audioFiles[i]}
                        startFrom={0}
                    />
                </Sequence>
            ))}
        </div>
    );
};

export const RemotionVideo = () => {
    return (
        <Composition
            id="SlideShow"
            component={SlideShow}
            durationInFrames={109313} // hardcoded for now
            fps={30}
            width={1920}
            height={1080}
            defaultProps={{
                audioFiles: [],
                imageFiles: [],
                audioDurations: []
            }}
        />
    );
};