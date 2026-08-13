import { Config } from "@remotion/cli/config";

// PNG keeps the blur/grain/soft-light stack clean through the encoder.
Config.setVideoImageFormat("png");
Config.setOverwriteOutput(true);
Config.setChromiumOpenGlRenderer("angle");
