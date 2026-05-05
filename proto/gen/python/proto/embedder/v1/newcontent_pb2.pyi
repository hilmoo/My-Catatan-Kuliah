from google.protobuf.internal import enum_type_wrapper as _enum_type_wrapper
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from typing import ClassVar as _ClassVar, Optional as _Optional, Union as _Union

DESCRIPTOR: _descriptor.FileDescriptor

class EntityType(int, metaclass=_enum_type_wrapper.EnumTypeWrapper):
    __slots__ = ()
    ENTITY_TYPE_UNSPECIFIED: _ClassVar[EntityType]
    ENTITY_TYPE_ASSIGNMENT: _ClassVar[EntityType]
    ENTITY_TYPE_NOTE: _ClassVar[EntityType]
ENTITY_TYPE_UNSPECIFIED: EntityType
ENTITY_TYPE_ASSIGNMENT: EntityType
ENTITY_TYPE_NOTE: EntityType

class NewContent(_message.Message):
    __slots__ = ("id", "entity_type")
    ID_FIELD_NUMBER: _ClassVar[int]
    ENTITY_TYPE_FIELD_NUMBER: _ClassVar[int]
    id: int
    entity_type: EntityType
    def __init__(self, id: _Optional[int] = ..., entity_type: _Optional[_Union[EntityType, str]] = ...) -> None: ...
