import { Config } from "@remotion/cli/config";

// Heavy blur and transparency stacks: PNG frames keep the gradients clean.
Config.setVideoImageFormat("png");
Config.setOverwriteOutput(true);
Config.setChromiumOpenGlRenderer("angle");
