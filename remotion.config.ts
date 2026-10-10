import {Config} from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(92);
Config.setColorSpace('bt709'); // jpeg frames otherwise come out yuvj420p, which some Windows players refuse
Config.setOverwriteOutput(true);
Config.setConcurrency(6);
Config.setCrf(16);
