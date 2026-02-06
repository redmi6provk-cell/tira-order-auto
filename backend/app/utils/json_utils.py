from datetime import datetime, date
from uuid import UUID
import json

class AlchemyEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, (datetime, date)):
            return obj.isoformat()
        if isinstance(obj, UUID):
            return str(obj)
        if hasattr(obj, '__str__') and ('Url' in type(obj).__name__ or 'URL' in type(obj).__name__):
            return str(obj)
        return super(AlchemyEncoder, self).default(obj)

def to_json(obj):
    """Convert object to JSON string handling UUIDs and datetimes"""
    return json.dumps(obj, cls=AlchemyEncoder)
