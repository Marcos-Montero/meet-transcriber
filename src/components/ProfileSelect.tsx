import { useState, useEffect, useCallback, useRef } from "react";
import type { Profile } from "../types";

interface ProfileSelectProps {
  onProfileSelected: (profileId: string) => void;
}

function PinInput({ onSubmit, error }: { onSubmit: (pin: string) => void; error: string | null }) {
  const [digits, setDigits] = useState(["", "", "", ""]);
  const refs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  const handleChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...digits];
    next[index] = value;
    setDigits(next);

    if (value && index < 3) {
      refs[index + 1].current?.focus();
    }

    if (index === 3 && value) {
      const pin = next.join("");
      if (pin.length === 4) onSubmit(pin);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      refs[index - 1].current?.focus();
    }
  };

  useEffect(() => {
    if (error) {
      setDigits(["", "", "", ""]);
      refs[0].current?.focus();
    }
  }, [error]);

  useEffect(() => {
    refs[0].current?.focus();
  }, []);

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="flex gap-3">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={refs[i]}
            type="password"
            inputMode="numeric"
            maxLength={1}
            value={d}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            className="w-12 h-14 text-center text-xl font-bold bg-zinc-800 border-2 border-zinc-700 focus:border-indigo-500 rounded-xl outline-none text-zinc-100 transition-colors"
          />
        ))}
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
    </div>
  );
}

export default function ProfileSelect({ onProfileSelected }: ProfileSelectProps) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);

  useEffect(() => {
    window.api.profiles.list().then(setProfiles);
  }, []);

  const handlePinSubmit = useCallback(
    async (pin: string) => {
      if (!selectedProfile) return;
      setPinError(null);
      const ok = await window.api.profiles.verifyPin(selectedProfile.id, pin);
      if (ok) {
        onProfileSelected(selectedProfile.id);
      } else {
        setPinError("Wrong PIN");
      }
    },
    [selectedProfile, onProfileSelected]
  );

  // PIN entry screen
  if (selectedProfile) {
    return (
      <div className="flex h-screen bg-[#0a0a0a] text-[#ededed] items-center justify-center">
        <div className="flex flex-col items-center">
          <button
            onClick={() => { setSelectedProfile(null); setPinError(null); }}
            className="self-start text-zinc-500 hover:text-zinc-300 text-sm mb-8 transition-colors"
          >
            &larr; Back
          </button>

          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold mb-4"
            style={{ backgroundColor: selectedProfile.color + "30", color: selectedProfile.color }}
          >
            {selectedProfile.name[0]}
          </div>
          <h2 className="text-xl font-semibold text-zinc-100 mb-6">
            {selectedProfile.name}
          </h2>

          <p className="text-sm text-zinc-500 mb-4">Enter your PIN</p>
          <PinInput onSubmit={handlePinSubmit} error={pinError} />
        </div>
      </div>
    );
  }

  // Profile selection screen
  return (
    <div className="flex h-screen bg-[#0a0a0a] text-[#ededed] items-center justify-center">
      <div className="flex flex-col items-center">
        <h1 className="text-2xl font-bold text-zinc-100 mb-2">Who's watching?</h1>
        <p className="text-sm text-zinc-500 mb-10">Select your profile</p>

        <div className="flex gap-8">
          {profiles.map((profile) => (
            <button
              key={profile.id}
              onClick={() => setSelectedProfile(profile)}
              className="flex flex-col items-center gap-3 group"
            >
              <div
                className="w-24 h-24 rounded-2xl flex items-center justify-center text-4xl font-bold transition-transform group-hover:scale-105 group-hover:ring-2 ring-offset-2 ring-offset-[#0a0a0a]"
                style={{
                  backgroundColor: profile.color + "20",
                  color: profile.color,
                  ringColor: profile.color,
                }}
              >
                {profile.name[0]}
              </div>
              <span className="text-sm text-zinc-400 group-hover:text-zinc-100 transition-colors">
                {profile.name}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
