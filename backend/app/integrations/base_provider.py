"""Base interface for public and simulated data providers."""

from abc import ABC, abstractmethod
from typing import List, Dict, Any


class BaseDataProvider(ABC):
    @abstractmethod
    async def fetch_hospitals(self, city: str = "Bengaluru") -> List[Dict[str, Any]]:
        """Fetch hospital data."""
        pass

    @abstractmethod
    async def fetch_ambulances(self) -> List[Dict[str, Any]]:
        """Fetch ambulance telemetry and capabilities."""
        pass
