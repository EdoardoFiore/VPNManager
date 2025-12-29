from typing import Optional, List, Dict
from datetime import datetime
import enum

# Re-export from new locations
from backend.core.models import (
    User, UserRole, UserInstance, 
    SystemSettings, SMTPSettings, BackupSettings
)
from backend.modules.wireguard.models import (
    Instance, InstanceBase, InstanceRead, 
    Client, Group, GroupMember, GroupRead, MagicToken
)
from backend.modules.firewall.models import (
    FirewallRule, MachineFirewallRule
)
