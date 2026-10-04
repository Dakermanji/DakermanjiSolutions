import assert from 'node:assert/strict';
import test from 'node:test';
import {
    canBeAssigned,
    canChangeTaskStage,
    canManageMembers,
    canManageTasks,
    canPostTaskMessage,
    canViewProject,
} from '../../services/kanban/permissions.js';

test('only the owner manages membership', () => {
    assert.equal(canManageMembers('owner'), true);
    for (const role of ['admin', 'editor', 'observer', undefined]) {
        assert.equal(canManageMembers(role), false);
    }
});

test('owner and admins manage tasks; observers can participate in discussion', () => {
    assert.equal(canManageTasks('owner'), true);
    assert.equal(canManageTasks('admin'), true);
    assert.equal(canManageTasks('editor'), false);
    assert.equal(canManageTasks('observer'), false);
    for (const role of ['owner', 'admin', 'editor', 'observer']) {
        assert.equal(canViewProject(role), true);
        assert.equal(canPostTaskMessage(role), true);
    }
    assert.equal(canViewProject(undefined), false);
    assert.equal(canPostTaskMessage(undefined), false);
});

test('owner, admins, and editors can be assigned, but observers cannot', () => {
    for (const role of ['owner', 'admin', 'editor']) {
        assert.equal(canBeAssigned(role), true);
    }
    assert.equal(canBeAssigned('observer'), false);
});

test('only managers or the current assignee can change a task stage', () => {
    assert.equal(canChangeTaskStage('owner', 'owner-id', 'editor-id'), true);
    assert.equal(canChangeTaskStage('admin', 'admin-id', 'editor-id'), true);
    assert.equal(canChangeTaskStage('editor', 'editor-id', 'editor-id'), true);
    assert.equal(canChangeTaskStage('editor', 'other-editor', 'editor-id'), false);
    assert.equal(canChangeTaskStage('editor', 'editor-id', null), false);
    assert.equal(canChangeTaskStage('observer', 'observer-id', 'observer-id'), false);
    assert.equal(canChangeTaskStage(undefined, 'editor-id', 'editor-id'), false);
});
