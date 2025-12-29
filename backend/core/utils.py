import subprocess
import logging
from typing import List, Tuple, Optional

logger = logging.getLogger("madmin.core.utils")

def run_command(command: List[str], check: bool = True, suppress_errors: bool = False) -> Tuple[bool, Optional[str]]:
    """Generic wrapper for subprocess run"""
    try:
        # Popen/run with list is safer
        logger.debug(f"Exec: {' '.join(command)}")
        result = subprocess.run(command, check=check, capture_output=True, text=True)
        return True, result.stdout.strip()
    except subprocess.CalledProcessError as e:
        if not suppress_errors:
            error_msg = f"Command error: {e.stderr.strip()} CMD: {' '.join(command)}"
            logger.error(error_msg)
            return False, error_msg
        return False, e.stderr.strip()
    except Exception as e:
        logger.error(f"Execution failed: {e}")
        return False, str(e)
