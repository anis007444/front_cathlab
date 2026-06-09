import * as cornerstone from "cornerstone-core";
import * as cornerstoneTools from "cornerstone-tools";
import * as cornerstoneWADOImageLoader from "cornerstone-wado-image-loader";
import dicomParser from "dicom-parser";
import Hammer from "hammerjs";
import cornerstoneMath from "cornerstone-math";

let initialized = false;

export const initCornerstone = () => {
  if (initialized) return;

  // 🔗 Lier les modules
  cornerstoneTools.external.cornerstone = cornerstone;
  cornerstoneTools.external.Hammer = Hammer;
  cornerstoneTools.external.cornerstoneMath = cornerstoneMath;

  cornerstoneWADOImageLoader.external.cornerstone = cornerstone;
  cornerstoneWADOImageLoader.external.dicomParser = dicomParser;

  // ⚙️ Init tools
  cornerstoneTools.init();

  // ⚡ Performance option pour l'image loader
  cornerstoneWADOImageLoader.configure({
    useWebWorkers: true,
  });

  initialized = true;

  console.log("✅ Cornerstone initialized");
};
