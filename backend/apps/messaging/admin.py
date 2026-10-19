from django.contrib import admin

from .models import Message, MessageRead, Thread


class MessageInline(admin.TabularInline):
    model = Message
    extra = 0
    fields = ("sender", "body", "sent_at")
    readonly_fields = ("sender", "body", "sent_at")


@admin.register(Thread)
class ThreadAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "created_by", "last_message_at", "created_at")
    list_filter = ("created_at",)
    search_fields = ("title", "participants__email")
    filter_horizontal = ("participants",)
    readonly_fields = ("created_at", "updated_at")
    inlines = [MessageInline]


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ("id", "thread", "sender", "body", "sent_at")
    list_filter = ("sent_at",)
    search_fields = ("body", "sender__email")
    readonly_fields = ("created_at", "updated_at", "sent_at")


@admin.register(MessageRead)
class MessageReadAdmin(admin.ModelAdmin):
    list_display = ("id", "message", "user", "read_at")
    list_filter = ("read_at",)
    search_fields = ("user__email",)
    readonly_fields = ("created_at", "updated_at", "read_at")
