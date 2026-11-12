// Offline UV placement only. Stable roster IDs identify the portraits; this
// detects face geometry, never identifies a person or classifies ethnicity.
import Foundation
import Vision
import ImageIO

let cache = URL(fileURLWithPath: CommandLine.arguments[1])
let files = try FileManager.default.contentsOfDirectory(at: cache, includingPropertiesForKeys: nil).filter { $0.pathExtension == "png" && Int($0.deletingPathExtension().lastPathComponent) != nil }.sorted { $0.lastPathComponent < $1.lastPathComponent }
var faces: [String: [Double]] = [:]
for (index, file) in files.enumerated() {
    let request = VNDetectFaceRectanglesRequest()
    do {
        try VNImageRequestHandler(url: file, options: [:]).perform([request])
        if let face = request.results?.max(by: { $0.boundingBox.width < $1.boundingBox.width }) {
            let b = face.boundingBox
            faces[file.deletingPathExtension().lastPathComponent] = [Double(b.minX), Double(1-b.maxY), Double(b.width), Double(b.height)]
        }
    } catch { fputs("Skipped \(file.lastPathComponent): \(error)\n", stderr) }
    if index % 200 == 0 { fputs("Face placement \(index)/\(files.count)\n", stderr) }
}
let result = try JSONSerialization.data(withJSONObject: faces, options: [.sortedKeys])
try result.write(to: cache.appendingPathComponent("face-bounds.json"))
print("Wrote \(faces.count) portrait placements")
