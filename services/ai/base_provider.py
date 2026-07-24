"""
Abstract AI Provider Interface

Defines the contract for all AI providers (Gemini, OpenAI, Claude, etc.).
Each provider must implement:
- generate() — basic text generation
- generate_structured() — structured JSON generation with schema
- get_model_info() — metadata about the active model
- count_tokens() — token counting for budget management
"""

from abc import ABC, abstractmethod
from typing import Optional


class AIProvider(ABC):
    """Abstract base class for AI providers."""

    @abstractmethod
    def generate(
        self,
        prompt: str,
        temperature: float = 0.7,
        max_output_tokens: int = 8192,
        system_instruction: Optional[str] = None,
    ) -> str:
        """Generate text from a prompt.

        Args:
            prompt: The input prompt.
            temperature: Sampling temperature (0.0 = deterministic).
            max_output_tokens: Maximum tokens in the response.
            system_instruction: Optional system-level instruction.

        Returns:
            Generated text string.
        """
        ...

    @abstractmethod
    def generate_structured(
        self,
        prompt: str,
        temperature: float = 0.2,
        max_output_tokens: int = 8192,
        system_instruction: Optional[str] = None,
    ) -> dict | list:
        """Generate structured JSON from a prompt.

        Args:
            prompt: The input prompt.
            temperature: Sampling temperature (lower for structured output).
            max_output_tokens: Maximum tokens in the response.
            system_instruction: Optional system-level instruction.

        Returns:
            Parsed JSON object (dict or list).
        """
        ...

    @abstractmethod
    def get_model_info(self) -> dict:
        """Return metadata about the active model.

        Returns:
            Dict with keys: model_name, provider, version, supports_structured
        """
        ...

    @abstractmethod
    def count_tokens(self, text: str) -> int:
        """Estimate token count for a given text.

        Args:
            text: Input text to count.

        Returns:
            Estimated token count.
        """
        ...

    @abstractmethod
    def is_available(self) -> bool:
        """Check if this provider is properly configured and usable.

        Returns:
            True if the provider can accept requests.
        """
        ...

    def get_capabilities(self) -> dict:
        """Return provider capabilities metadata.

        Override in subclasses to report specific capabilities.
        """
        return {
            "supports_structured": True,
            "supports_streaming": False,
            "supports_system_instruction": True,
            "max_context_tokens": 128000,
            "max_output_tokens": 8192,
        }

