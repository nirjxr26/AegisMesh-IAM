const prisma = require('../config/database');

function selectNotificationFields() {
    return {
        id: true,
        type: true,
        title: true,
        message: true,
        link: true,
        read: true,
        readAt: true,
        metadata: true,
        createdAt: true,
    };
}

exports.getNotifications = async (req, res, next) => {
    try {
        const page = Number(req.query.page || 1);
        const limit = Number(req.query.limit || 20);
        const unreadOnly = req.query.unreadOnly === true || req.query.unreadOnly === 'true';
        const type = req.query.type || null;
        const skip = (page - 1) * limit;

        const where = { userId: req.user.id };
        if (unreadOnly) {
            where.read = false;
        }
        if (type) {
            where.type = type;
        }

        const [items, total, unreadCount] = await Promise.all([
            prisma.notificationLog.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                select: selectNotificationFields(),
            }),
            prisma.notificationLog.count({ where }),
            prisma.notificationLog.count({ where: { userId: req.user.id, read: false } }),
        ]);

        res.json({
            success: true,
            data: {
                items,
                unreadCount,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.max(1, Math.ceil(total / limit)),
                    hasNext: skip + items.length < total,
                    hasPrev: page > 1,
                },
            },
        });
    } catch (error) {
        next(error);
    }
};

exports.updateNotificationReadState = async (req, res, next) => {
    try {
        const { id } = req.params;
        const shouldMarkRead = req.body?.read !== false;

        const existing = await prisma.notificationLog.findFirst({
            where: {
                id,
                userId: req.user.id,
            },
            select: { id: true },
        });

        if (!existing) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: 'Notification not found',
                },
            });
        }

        const updated = await prisma.notificationLog.update({
            where: { id },
            data: {
                read: shouldMarkRead,
                readAt: shouldMarkRead ? new Date() : null,
            },
            select: selectNotificationFields(),
        });

        res.json({ success: true, data: updated });
    } catch (error) {
        next(error);
    }
};

exports.markAllNotificationsRead = async (req, res, next) => {
    try {
        const result = await prisma.notificationLog.updateMany({
            where: {
                userId: req.user.id,
                read: false,
            },
            data: {
                read: true,
                readAt: new Date(),
            },
        });

        res.json({ success: true, data: { updated: result.count } });
    } catch (error) {
        next(error);
    }
};

exports.deleteNotification = async (req, res, next) => {
    try {
        const { id } = req.params;

        const existing = await prisma.notificationLog.findFirst({
            where: {
                id,
                userId: req.user.id,
            },
            select: { id: true },
        });

        if (!existing) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: 'Notification not found',
                },
            });
        }

        await prisma.notificationLog.delete({ where: { id } });

        res.json({ success: true, data: { deletedId: id } });
    } catch (error) {
        next(error);
    }
};