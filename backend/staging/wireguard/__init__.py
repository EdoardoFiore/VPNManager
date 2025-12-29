# WireGuard Module Entrypoint
# This file exposes the 'register_module' (optional) or just ensuring package structure

from .router import router
from .models import WGInstance, WGPeer
