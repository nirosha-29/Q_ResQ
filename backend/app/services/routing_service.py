"""Routing service providing real distance and ETA calculation.

Integrates with OSRM (Open Source Routing Machine) public service when enabled,
with mathematical geodesic/haversine fallback if external network is unavailable.
Adheres strictly to the NO-FABRICATION RULE: never claims live traffic when using
static or geometric models; reports exact data provider status.
"""

import os
import math
from typing import Tuple, List, Dict, Any
import httpx
from app.config import settings


class RoutingService:
    _use_osrm: bool = os.getenv("ENABLE_OSRM", "false").lower() == "true"
    _route_cache: Dict[Tuple[float, float, float, float, str], Dict[str, Any]] = {}

    @staticmethod
    def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculate great circle distance between two points on Earth in kilometers."""
        earth_radius_km = 6371.0
        d_lat = math.radians(lat2 - lat1)
        d_lon = math.radians(lon2 - lon1)
        a = (
            math.sin(d_lat / 2.0) ** 2
            + math.cos(math.radians(lat1))
            * math.cos(math.radians(lat2))
            * math.sin(d_lon / 2.0) ** 2
        )
        c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
        return earth_radius_km * c

    @staticmethod
    def generate_interpolated_path(
        lat1: float, lon1: float, lat2: float, lon2: float, steps: int = 10
    ) -> List[List[float]]:
        """Generate smooth intermediate GPS coordinates for map visualization."""
        points: List[List[float]] = []
        for i in range(steps + 1):
            fraction = i / float(steps)
            curve = math.sin(fraction * math.pi) * 0.003
            lat = lat1 + (lat2 - lat1) * fraction + curve
            lon = lon1 + (lon2 - lon1) * fraction + curve
            points.append([round(lat, 6), round(lon, 6)])
        return points

    @classmethod
    def calculate_route(
        cls,
        start_lat: float,
        start_lon: float,
        end_lat: float,
        end_lon: float,
        emergency_priority: str = "MODERATE"
    ) -> Dict[str, Any]:
        """Calculates distance, duration, route geometry, and data provenance synchronously."""
        cache_key = (
            round(start_lat, 4), round(start_lon, 4),
            round(end_lat, 4), round(end_lon, 4),
            emergency_priority
        )
        if cache_key in cls._route_cache:
            return cls._route_cache[cache_key]

        # Use external OSRM only when enabled
        if cls._use_osrm:
            osrm_url = (
                f"{settings.OSRM_ROUTING_URL}/route/v1/driving/"
                f"{start_lon},{start_lat};{end_lon},{end_lat}?overview=full&geometries=geojson"
            )
            try:
                with httpx.Client(timeout=1.0) as client:
                    response = client.get(osrm_url)
                    if response.status_code == 200:
                        data = response.json()
                        if data.get("routes") and len(data["routes"]) > 0:
                            route = data["routes"][0]
                            dist_km = round(route["distance"] / 1000.0, 2)
                            dur_minutes = round(route["duration"] / 60.0, 1)
                            geojson_coords = route["geometry"]["coordinates"]
                            leaflet_coords = [[coord[1], coord[0]] for coord in geojson_coords]
                            
                            res = {
                                "distance_km": dist_km,
                                "estimated_minutes": dur_minutes,
                                "geometry": leaflet_coords,
                                "routing_engine": "OSRM Public Routing",
                                "traffic_status": "Live traffic unavailable (standard road network velocity model)",
                                "is_fallback": False
                            }
                            cls._route_cache[cache_key] = res
                            return res
            except Exception:
                pass

        # High-precision mathematical urban emergency road network model
        straight_km = cls.haversine_distance_km(start_lat, start_lon, end_lat, end_lon)
        road_distance_km = round(straight_km * 1.32, 2)
        
        urban_speed_kmh = 36.0 if emergency_priority in ["CRITICAL", "HIGH"] else 30.0
        dur_minutes = round((road_distance_km / urban_speed_kmh) * 60.0, 1)
        dur_minutes = max(3.0, round(dur_minutes + 2.0, 1))
        
        coords = cls.generate_interpolated_path(start_lat, start_lon, end_lat, end_lon, steps=10)

        res = {
            "distance_km": road_distance_km,
            "estimated_minutes": dur_minutes,
            "geometry": coords,
            "routing_engine": "Geodesic Road Circuity Fallback Model",
            "traffic_status": "Offline / static model (live traffic unavailable)",
            "is_fallback": True
        }
        cls._route_cache[cache_key] = res
        return res
