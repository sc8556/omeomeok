import { useState, useEffect, useCallback } from "react";
import * as Location from "expo-location";
import { geocodeApi } from "@/services/api";

export type LocationStatus = "idle" | "requesting" | "granted" | "denied" | "unavailable";

export interface UserLocation {
  latitude: number;
  longitude: number;
}

// Fallback when GPS is unavailable (Seoul City Hall)
const DEFAULT_LOCATION: UserLocation = { latitude: 37.5665, longitude: 126.9780 };
const DEFAULT_ADDRESS = "서울 중구 태평로1가 (기본 위치)";

interface UseLocationReturn {
  location: UserLocation;
  address: string | null;
  addressLoading: boolean;
  isDefaultLocation: boolean;
  status: LocationStatus;
  requestPermission: () => Promise<void>;
}

export function useLocation(): UseLocationReturn {
  const [location, setLocation] = useState<UserLocation>(DEFAULT_LOCATION);
  const [address, setAddress] = useState<string | null>(null);
  const [addressLoading, setAddressLoading] = useState(false);
  const [isDefaultLocation, setIsDefaultLocation] = useState(true);
  const [status, setStatus] = useState<LocationStatus>("idle");

  const fetchAddress = useCallback(async (coords: UserLocation, isDefault: boolean) => {
    setAddressLoading(true);
    try {
      const result = await geocodeApi.reverse(coords.latitude, coords.longitude);
      if (result.address) {
        setAddress(isDefault ? `${result.address} (기본 위치)` : result.address);
      }
    } catch {
      if (isDefault) setAddress(DEFAULT_ADDRESS);
    } finally {
      setAddressLoading(false);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    setStatus("requesting");
    try {
      const { status: permStatus } = await Location.requestForegroundPermissionsAsync();

      if (permStatus !== "granted") {
        setStatus("denied");
        setLocation(DEFAULT_LOCATION);
        setIsDefaultLocation(true);
        fetchAddress(DEFAULT_LOCATION, true);
        return;
      }

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const coords: UserLocation = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      };
      setLocation(coords);
      setIsDefaultLocation(false);
      setStatus("granted");
      fetchAddress(coords, false);
    } catch {
      setStatus("unavailable");
      setLocation(DEFAULT_LOCATION);
      setIsDefaultLocation(true);
      fetchAddress(DEFAULT_LOCATION, true);
    }
  }, [fetchAddress]);

  // Auto-request on mount
  useEffect(() => {
    requestPermission();
  }, [requestPermission]);

  return { location, address, addressLoading, isDefaultLocation, status, requestPermission };
}
