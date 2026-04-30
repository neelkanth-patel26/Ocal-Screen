import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCameraDevices } from "./useCameraDevices";

const mockDevices = [
	{ kind: "videoinput", deviceId: "cam1", label: "Camera 1", groupId: "group1" },
	{ kind: "videoinput", deviceId: "cam2", label: "Camera 2", groupId: "group1" },
	{ kind: "audioinput", deviceId: "mic1", label: "Mic 1", groupId: "group2" },
];

describe("useCameraDevices", () => {
	beforeEach(() => {
		vi.spyOn(navigator.mediaDevices, "enumerateDevices").mockResolvedValue(
			mockDevices as MediaDeviceInfo[],
		);
		vi.spyOn(navigator.mediaDevices, "getUserMedia").mockResolvedValue({
			getTracks: () => [{ stop: vi.fn() }],
		} as unknown as MediaStream);
		vi.spyOn(navigator.mediaDevices, "addEventListener");
		vi.spyOn(navigator.mediaDevices, "removeEventListener");
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("should list video input devices", async () => {
		const { result } = renderHook(() => useCameraDevices(true));

		await waitFor(() => {
			expect(result.current.devices).toHaveLength(2);
		});

		expect(result.current.devices[0].label).toBe("Camera 1");
		expect(result.current.devices[1].deviceId).toBe("cam2");
	});

	it("should set first device as default", async () => {
		const { result } = renderHook(() => useCameraDevices(true));

		await waitFor(() => {
			expect(result.current.selectedDeviceId).toBe("cam1");
		});
	});

	it("should use device ID as fallback label when label is missing", async () => {
		vi.mocked(navigator.mediaDevices.enumerateDevices).mockResolvedValueOnce([
			{ kind: "videoinput", deviceId: "cam1abc123456", label: "", groupId: "group1" },
		] as MediaDeviceInfo[]);

		const { result } = renderHook(() => useCameraDevices(true));

		await waitFor(() => {
			expect(result.current.devices[0]?.label).toBe("Camera cam1abc1");
		});

		expect(navigator.mediaDevices.getUserMedia).not.toHaveBeenCalled();
	});

	it("should set error state when enumeration fails", async () => {
		vi.mocked(navigator.mediaDevices.enumerateDevices).mockRejectedValueOnce(
			new Error("Permission denied"),
		);

		const { result } = renderHook(() => useCameraDevices(true));

		await waitFor(() => {
			expect(result.current.error).toBe("Permission denied");
		});

		expect(result.current.devices).toHaveLength(0);
		expect(result.current.isLoading).toBe(false);
	});

	it("should fall back to first available device when selected device is unplugged", async () => {
		const { result } = renderHook(() => useCameraDevices(true));

		await waitFor(() => {
			expect(result.current.selectedDeviceId).toBe("cam1");
		});

		const cam2Only = [
			{ kind: "videoinput", deviceId: "cam2", label: "Camera 2", groupId: "group1" },
		];
		vi.mocked(navigator.mediaDevices.enumerateDevices).mockResolvedValueOnce(
			cam2Only as MediaDeviceInfo[],
		);

		const devicechangeHandler = (
			navigator.mediaDevices.addEventListener as ReturnType<typeof vi.fn>
		).mock.calls[0]?.[1] as (() => void) | undefined;

		await act(async () => {
			devicechangeHandler?.();
		});

		await waitFor(() => {
			expect(result.current.selectedDeviceId).toBe("cam2");
		});
	});
});
