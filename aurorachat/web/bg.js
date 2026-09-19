import { Kawarp } from 'https://esm.sh/@kawarp/core';
const canvas = document.querySelector('canvas');
const kawarp = new Kawarp(canvas);

kawarp.warpIntensity = 0.74
kawarp.blurPasses = 6
kawarp.animationSpeed = 1.3
kawarp.saturation = 2.0
await kawarp.loadImage('bg.png');
kawarp.start();