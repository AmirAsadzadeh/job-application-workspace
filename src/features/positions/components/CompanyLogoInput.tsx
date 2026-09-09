import { Image, Link2, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { MAX_LOGO_BYTES, type CompanyLogoInput } from "../../../../shared/positionSchema";

type Props = {
  value: CompanyLogoInput;
  companyName: string;
  error?: string;
  onChange: (value: CompanyLogoInput) => void;
  onError: (message: string) => void;
};

const acceptedTypes = ["image/png", "image/jpeg", "image/svg+xml"];

function readBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read this image."));
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.readAsDataURL(file);
  });
}

export function CompanyLogoInput({ value, companyName, error, onChange, onError }: Props) {
  const [imageFailed, setImageFailed] = useState(false);
  const initial = companyName.trim().charAt(0).toLocaleUpperCase() || "?";
  const source = value.kind === "remote"
    ? value.url
    : value.kind === "upload" && value.dataBase64
      ? `data:${value.mediaType};base64,${value.dataBase64}`
      : "";

  useEffect(() => setImageFailed(false), [source]);

  async function selectFile(file: File | undefined) {
    if (!file) return;
    if (!acceptedTypes.includes(file.type)) {
      onError("Choose a PNG, JPG, or SVG image.");
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      onError("Logo must be 2 MB or smaller.");
      return;
    }
    try {
      const dataBase64 = await readBase64(file);
      onError("");
      onChange({ kind: "upload", fileName: file.name, mediaType: file.type as "image/png" | "image/jpeg" | "image/svg+xml", dataBase64 });
    } catch (readError) {
      onError(readError instanceof Error ? readError.message : "Could not read this image.");
    }
  }

  return (
    <div className="logo-input" data-field="companyLogo">
      <span className="field-label">Company logo <span className="optional-label">Optional</span></span>
      <div className="logo-control-row">
        <span className="company-logo logo-preview" aria-label="Company logo preview">
          {source && !imageFailed ? <img src={source} alt="" onError={() => setImageFailed(true)} /> : initial}
        </span>
        <div className="logo-modes" aria-label="Company logo source">
          <button type="button" className={value.kind === "none" ? "active" : ""} aria-pressed={value.kind === "none"} onClick={() => { onError(""); onChange({ kind: "none" }); }}><Image size={14} /> None</button>
          <button type="button" className={value.kind === "upload" ? "active" : ""} aria-pressed={value.kind === "upload"} onClick={() => { onError(""); onChange({ kind: "upload", fileName: "", mediaType: "image/png", dataBase64: "" }); }}><Upload size={14} /> Upload</button>
          <button type="button" className={value.kind === "remote" ? "active" : ""} aria-pressed={value.kind === "remote"} onClick={() => { onError(""); onChange({ kind: "remote", url: "" }); }}><Link2 size={14} /> Image URL</button>
        </div>
      </div>
      {value.kind === "upload" && <input aria-label="Upload company logo" type="file" accept=".png,.jpg,.jpeg,.svg,image/png,image/jpeg,image/svg+xml" onChange={(event) => void selectFile(event.target.files?.[0])} />}
      {value.kind === "remote" && <input aria-label="Company logo image URL" type="url" inputMode="url" placeholder="https://" value={value.url} onChange={(event) => { onError(""); onChange({ kind: "remote", url: event.target.value }); }} />}
      {value.kind === "upload" && value.fileName && <span className="file-name">{value.fileName}</span>}
      {error && <p className="field-error" role="alert">{error}</p>}
    </div>
  );
}
