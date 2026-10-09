/**
 * Realistic procedural audio generator for background music and SFX presets.
 * Renders high-quality audio in-memory using Web Audio API (OfflineAudioContext)
 * and exports standard playable WAV blob URLs.
 */

const audioUrlCache = new Map<string, string>();

/**
 * Encodes an AudioBuffer into a standard 16-bit PCM WAV Blob.
 */
function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
	const numOfChan = buffer.numberOfChannels;
	const length = buffer.length * numOfChan * 2 + 44;
	const out = new DataView(new ArrayBuffer(length));
	const channels: Float32Array[] = [];
	let sample = 0;
	let offset = 0;
	let pos = 0;

	// Write RIFF header
	function writeString(s: string) {
		for (let i = 0; i < s.length; i++) {
			out.setUint8(pos++, s.charCodeAt(i));
		}
	}

	writeString("RIFF");
	out.setUint32(pos, length - 8, true);
	pos += 4;
	writeString("WAVE");
	writeString("fmt ");
	out.setUint32(pos, 16, true);
	pos += 4; // SubChunk1Size (16 for PCM)
	out.setUint16(pos, 1, true);
	pos += 2; // AudioFormat (1 for PCM)
	out.setUint16(pos, numOfChan, true);
	pos += 2;
	out.setUint32(pos, buffer.sampleRate, true);
	pos += 4;
	out.setUint32(pos, buffer.sampleRate * 2 * numOfChan, true);
	pos += 4; // byte rate
	out.setUint16(pos, numOfChan * 2, true);
	pos += 2; // block align
	out.setUint16(pos, 16, true);
	pos += 2; // bits per sample
	writeString("data");
	out.setUint32(pos, length - pos - 4, true);
	pos += 4;

	for (let i = 0; i < buffer.numberOfChannels; i++) {
		channels.push(buffer.getChannelData(i));
	}

	while (offset < buffer.length) {
		for (let i = 0; i < numOfChan; i++) {
			sample = Math.max(-1, Math.min(1, channels[i][offset]));
			sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
			out.setInt16(pos, sample, true);
			pos += 2;
		}
		offset++;
	}

	return new Blob([out.buffer], { type: "audio/wav" });
}

/**
 * Generates an AudioBuffer for a given music or sound effect preset.
 */
async function synthesizePresetBuffer(presetId: string): Promise<AudioBuffer> {
	const sampleRate = 44100;

	if (presetId === "whoosh-sfx") {
		// 1.5 seconds smooth noise whoosh
		const duration = 1.5;
		const ctx = new OfflineAudioContext(2, sampleRate * duration, sampleRate);

		// White noise buffer
		const noiseLen = sampleRate * duration;
		const noiseBuf = ctx.createBuffer(1, noiseLen, sampleRate);
		const data = noiseBuf.getChannelData(0);
		for (let i = 0; i < noiseLen; i++) {
			data[i] = Math.random() * 2 - 1;
		}

		const src = ctx.createBufferSource();
		src.buffer = noiseBuf;

		const filter = ctx.createBiquadFilter();
		filter.type = "bandpass";
		filter.Q.value = 3.5;
		filter.frequency.setValueAtTime(200, 0);
		filter.frequency.exponentialRampToValueAtTime(3200, duration * 0.45);
		filter.frequency.exponentialRampToValueAtTime(150, duration);

		const gain = ctx.createGain();
		gain.gain.setValueAtTime(0.01, 0);
		gain.gain.linearRampToValueAtTime(0.7, duration * 0.45);
		gain.gain.linearRampToValueAtTime(0.001, duration);

		src.connect(filter);
		filter.connect(gain);
		gain.connect(ctx.destination);

		src.start(0);
		return await ctx.startRendering();
	}

	if (presetId === "mouse-click") {
		// 0.25 seconds crisp click
		const duration = 0.25;
		const ctx = new OfflineAudioContext(2, sampleRate * duration, sampleRate);

		const osc = ctx.createOscillator();
		osc.type = "sine";
		osc.frequency.setValueAtTime(1200, 0);
		osc.frequency.exponentialRampToValueAtTime(120, duration * 0.08);

		const gain = ctx.createGain();
		gain.gain.setValueAtTime(0.8, 0);
		gain.gain.exponentialRampToValueAtTime(0.001, duration * 0.1);

		osc.connect(gain);
		gain.connect(ctx.destination);

		osc.start(0);
		osc.stop(duration);
		return await ctx.startRendering();
	}

	// For music presets: render a pleasant looping 16-second chord and melody passage
	const duration = 16.0;
	const ctx = new OfflineAudioContext(2, sampleRate * duration, sampleRate);

	// Master filter & compression
	const masterFilter = ctx.createBiquadFilter();
	masterFilter.type = "lowpass";
	masterFilter.frequency.value =
		presetId === "sem-demora" ? 1100 : presetId === "chill-lofi" ? 1400 : 4500;
	masterFilter.connect(ctx.destination);

	// Chord progression definitions (frequencies in Hz)
	// sem-demora: Fmaj7 -> Em7 -> Dm7 -> Cmaj7 (64 BPM -> 4s per chord)
	// upbeat-vlog: C -> G -> Am -> F (120 BPM -> 2s per chord)
	// chill-lofi: Dm9 -> G13 -> Cmaj9 -> Am7
	// tech-future: Am -> F -> C -> Em
	let chordList: number[][];
	let bassList: number[];

	if (presetId === "sem-demora") {
		chordList = [
			[174.61, 220.0, 261.63, 329.63], // Fmaj7 (F3, A3, C4, E4)
			[164.81, 196.0, 246.94, 293.66], // Em7 (E3, G3, B3, D4)
			[146.83, 174.61, 220.0, 261.63], // Dm7 (D3, F3, A3, C4)
			[130.81, 164.81, 196.0, 246.94], // Cmaj7 (C3, E3, G3, B3)
		];
		bassList = [87.31, 82.41, 73.42, 65.41]; // F2, E2, D2, C2
	} else if (presetId === "upbeat-vlog") {
		chordList = [
			[261.63, 329.63, 392.0], // C
			[196.0, 246.94, 293.66], // G
			[220.0, 261.63, 329.63], // Am
			[174.61, 220.0, 261.63], // F
			[261.63, 329.63, 392.0], // C
			[196.0, 246.94, 293.66], // G
			[220.0, 261.63, 329.63], // Am
			[174.61, 220.0, 261.63], // F
		];
		bassList = [130.81, 98.0, 110.0, 87.31, 130.81, 98.0, 110.0, 87.31];
	} else if (presetId === "chill-lofi") {
		chordList = [
			[146.83, 220.0, 261.63, 329.63, 370.0], // Dm9
			[196.0, 246.94, 329.63, 370.0], // G13
			[130.81, 196.0, 246.94, 329.63, 392.0], // Cmaj9
			[220.0, 261.63, 329.63, 392.0], // Am7
		];
		bassList = [73.42, 98.0, 65.41, 110.0];
	} else {
		// Cyber tech minimal
		chordList = [
			[220.0, 261.63, 329.63], // Am
			[174.61, 220.0, 261.63], // F
			[261.63, 329.63, 392.0], // C
			[164.81, 196.0, 246.94], // Em
		];
		bassList = [110.0, 87.31, 130.81, 82.41];
	}

	const chordDuration = duration / chordList.length;

	// Synthesize chords
	chordList.forEach((chord, idx) => {
		const startTime = idx * chordDuration;
		const bassFreq = bassList[idx];

		// Bass note
		const bassOsc = ctx.createOscillator();
		bassOsc.type = "triangle";
		bassOsc.frequency.value = bassFreq;

		const bassGain = ctx.createGain();
		bassGain.gain.setValueAtTime(0.001, startTime);
		bassGain.gain.linearRampToValueAtTime(0.35, startTime + 0.1);
		bassGain.gain.setValueAtTime(0.3, startTime + chordDuration - 0.2);
		bassGain.gain.linearRampToValueAtTime(0.001, startTime + chordDuration);

		bassOsc.connect(bassGain);
		bassGain.connect(masterFilter);
		bassOsc.start(startTime);
		bassOsc.stop(startTime + chordDuration);

		// Chord notes
		chord.forEach((freq, noteIdx) => {
			const osc = ctx.createOscillator();
			osc.type = presetId === "sem-demora" || presetId === "chill-lofi" ? "sine" : "triangle";
			osc.frequency.value = freq;

			const noteGain = ctx.createGain();
			const noteStart = startTime + noteIdx * 0.04;
			noteGain.gain.setValueAtTime(0.001, noteStart);
			noteGain.gain.linearRampToValueAtTime(0.12, noteStart + 0.12);
			noteGain.gain.exponentialRampToValueAtTime(0.03, startTime + chordDuration - 0.1);
			noteGain.gain.linearRampToValueAtTime(0.001, startTime + chordDuration);

			osc.connect(noteGain);
			noteGain.connect(masterFilter);
			osc.start(noteStart);
			osc.stop(startTime + chordDuration);
		});

		// Gentle melodic pulse / arpeggio in upbeat / tech
		if (presetId === "upbeat-vlog" || presetId === "tech-future") {
			const steps = 4;
			for (let s = 0; s < steps; s++) {
				const arpTime = startTime + (s * chordDuration) / steps;
				const arpOsc = ctx.createOscillator();
				arpOsc.type = "sine";
				arpOsc.frequency.value = chord[s % chord.length] * 2;

				const arpGain = ctx.createGain();
				arpGain.gain.setValueAtTime(0.001, arpTime);
				arpGain.gain.linearRampToValueAtTime(0.08, arpTime + 0.02);
				arpGain.gain.exponentialRampToValueAtTime(0.001, arpTime + 0.3);

				arpOsc.connect(arpGain);
				arpGain.connect(masterFilter);
				arpOsc.start(arpTime);
				arpOsc.stop(arpTime + 0.35);
			}
		}
	});

	// Subtle vinyl texture for lofi tracks
	if (presetId === "sem-demora" || presetId === "chill-lofi") {
		const vinylLen = sampleRate * duration;
		const vinylBuf = ctx.createBuffer(1, vinylLen, sampleRate);
		const vData = vinylBuf.getChannelData(0);
		for (let i = 0; i < vinylLen; i++) {
			vData[i] = (Math.random() * 2 - 1) * (Math.random() < 0.003 ? 0.3 : 0.015);
		}
		const vSrc = ctx.createBufferSource();
		vSrc.buffer = vinylBuf;
		const vFilter = ctx.createBiquadFilter();
		vFilter.type = "lowpass";
		vFilter.frequency.value = 800;
		const vGain = ctx.createGain();
		vGain.gain.value = 0.08;

		vSrc.connect(vFilter);
		vFilter.connect(vGain);
		vGain.connect(ctx.destination);
		vSrc.start(0);
	}

	return await ctx.startRendering();
}

/**
 * Returns a playable object URL for a given audio preset ID.
 * Caches the generated Blob URL so audio starts instantly.
 */
export async function getPresetAudioUrl(presetId: string): Promise<string> {
	if (audioUrlCache.has(presetId)) {
		return audioUrlCache.get(presetId)!;
	}

	try {
		const buffer = await synthesizePresetBuffer(presetId);
		const blob = audioBufferToWavBlob(buffer);
		const url = URL.createObjectURL(blob);
		audioUrlCache.set(presetId, url);
		return url;
	} catch (error) {
		console.warn("Failed to synthesize preset audio:", error);
		return "";
	}
}
